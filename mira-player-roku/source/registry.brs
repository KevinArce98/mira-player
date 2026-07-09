function SaveCredentials(server as String, username as String, password as String) as Void
    sec = CreateObject("roRegistrySection", "credentials")
    sec.Write("server", server)
    sec.Write("username", username)
    sec.Write("password", password)
    sec.Flush()
end function

function LoadCredentials() as Dynamic
    sec = CreateObject("roRegistrySection", "credentials")
    server = sec.Read("server")
    username = sec.Read("username")
    password = sec.Read("password")
    if server = "" or username = "" or password = "" then return invalid
    return {server: server, username: username, password: password}
end function

function ClearCredentials() as Void
    reg = CreateObject("roRegistry")
    reg.Delete("credentials")
    reg.Delete("favorites")
    reg.Delete("progress")
    reg.Delete("browse")
    reg.Delete("parental")
    reg.Delete("continuar")
    reg.Delete("profiles")
    reg.Flush()
    
    sec = CreateObject("roRegistrySection", "sync")
    sec.Delete("account_secret")
    sec.Delete("active_profile_id")
    sec.Delete("cursor")
    sec.Flush()
end function

function LoadFavorites() as Object
    sec = CreateObject("roRegistrySection", "favorites")
    json = sec.Read("items")
    if json <> ""
        parsed = ParseJSON(json)
        if parsed <> invalid then return parsed
    end if
    ' Migrate old format (array of ID strings)
    json = sec.Read("ids")
    if json = "" then return []
    oldIds = ParseJSON(json)
    if oldIds = invalid then return []
    result = []
    for each id in oldIds
        result.Push({id: SafeStr(id), type: "movie", name: "", icon: "", stream_id: SafeStr(id), series_id: "", container_extension: ""})
    end for
    return result
end function

function SaveFavorites(items as Object) as Void
    sec = CreateObject("roRegistrySection", "favorites")
    rev = sec.Read("rev")
    if rev = "" then rev = "0"
    sec.Write("items", FormatJSON(items))
    sec.Write("rev", (Val(rev) + 1).ToStr())
    sec.Flush()
end function

function LoadFavoritesRev() as String
    sec = CreateObject("roRegistrySection", "favorites")
    rev = sec.Read("rev")
    if rev = "" then return "0"
    return rev
end function

function SaveFavoritesCAS(items as Object, expectedRev as String) as Boolean
    sec = CreateObject("roRegistrySection", "favorites")
    currentRev = sec.Read("rev")
    if currentRev = "" then currentRev = "0"
    if currentRev <> expectedRev then return false
    sec.Write("items", FormatJSON(items))
    sec.Write("rev", (Val(currentRev) + 1).ToStr())
    sec.Flush()
    return true
end function

function IsFavorite(id as String) as Boolean
    profileId = GetActiveProfileId()
    favs = LoadFavorites()
    for each fav in favs
        if type(fav) = "roAssociativeArray"
            owned = fav["profileId"] = invalid or fav["profileId"] = profileId
            if SafeStr(fav["id"]) = id and fav["deletedAt"] = invalid and owned then return true
        else
            if SafeStr(fav) = id then return true
        end if
    end for
    return false
end function

function ToggleFavorite(id as String, contentType as String, item as Object) as Boolean
    profileId = GetActiveProfileId()
    for attempt = 1 to 5
        rev = LoadFavoritesRev()
        favs = LoadFavorites()
        newFavs = []
        existing = invalid
        for each fav in favs
            if type(fav) = "roAssociativeArray"
                favId = SafeStr(fav["id"])
                owned = fav["profileId"] = invalid or fav["profileId"] = profileId
            else
                favId = SafeStr(fav)
                owned = true
            end if
            if favId = id and owned
                existing = fav
            else
                newFavs.Push(fav)
            end if
        end for

        isActive = (existing <> invalid) and (type(existing) <> "roAssociativeArray" or existing["deletedAt"] = invalid)
        result = not isActive

        if isActive
            icon = ""
            name = ""
            ftype = contentType
            sid = ""
            serId = ""
            ext = ""
            createdAt = NowEpochMs()
            if type(existing) = "roAssociativeArray"
                icon = SafeStr(existing["icon"])
                name = SafeStr(existing["name"])
                ftype = SafeStr(existing["type"])
                sid = SafeStr(existing["stream_id"])
                serId = SafeStr(existing["series_id"])
                ext = SafeStr(existing["container_extension"])
                if existing["createdAt"] <> invalid then createdAt = existing["createdAt"]
            end if
            newFavs.Push({
                id: id,
                type: ftype,
                name: name,
                icon: icon,
                stream_id: sid,
                series_id: serId,
                container_extension: ext,
                createdAt: createdAt,
                deletedAt: NowEpochMs(),
                profileId: profileId
            })
        else
            createdAt = NowEpochMs()
            if existing <> invalid and type(existing) = "roAssociativeArray" and existing["createdAt"] <> invalid then createdAt = existing["createdAt"]

            icon = SafeStr(item["stream_icon"])
            if icon = "" then icon = SafeStr(item["cover"])
            newFavs.Push({
                id: id,
                type: contentType,
                name: SafeStr(item["name"]),
                icon: icon,
                stream_id: SafeStr(item["stream_id"]),
                series_id: SafeStr(item["series_id"]),
                container_extension: SafeStr(item["container_extension"]),
                createdAt: createdAt,
                deletedAt: invalid,
                profileId: profileId
            })
        end if

        if attempt = 5
            SaveFavorites(newFavs)
            return result
        end if
        if SaveFavoritesCAS(newFavs, rev) then return result
    end for
    return false
end function

function SaveBrowseState(tipo as String, categoryId as String, sortMode as String) as Void
    sec = CreateObject("roRegistrySection", "browse")
    sec.Write("cat_" + tipo, categoryId)
    sec.Write("sort_" + tipo, sortMode)
    sec.Flush()
end function

function LoadBrowseState(tipo as String) as Object
    sec = CreateObject("roRegistrySection", "browse")
    return {category: sec.Read("cat_" + tipo), sort: sec.Read("sort_" + tipo)}
end function

function LoadCategoryOrder(tipo as String) as Object
    sec = CreateObject("roRegistrySection", "browse")
    json = sec.Read("order_" + tipo)
    if json = "" then return []
    parsed = ParseJSON(json)
    if parsed = invalid then return []
    return parsed
end function

function SaveCategoryOrder(tipo as String, ids as Object) as Void
    sec = CreateObject("roRegistrySection", "browse")
    sec.Write("order_" + tipo, FormatJSON(ids))
    sec.Flush()
end function

function ApplyCategoryOrder(categories as Object, orderIds as Object) as Object
    if orderIds.Count() = 0 then return categories
    ordered = []
    rest = []
    byId = {}
    for each cat in categories
        byId[SafeStr(cat["category_id"])] = cat
    end for
    used = {}
    for each id in orderIds
        key = SafeStr(id)
        if byId.DoesExist(key)
            ordered.Push(byId[key])
            used[key] = true
        end if
    end for
    for each cat in categories
        key = SafeStr(cat["category_id"])
        if not used.DoesExist(key)
            rest.Push(cat)
        end if
    end for
    for each cat in rest
        ordered.Push(cat)
    end for
    return ordered
end function

function IsParentalEnabled() as Boolean
    sec = CreateObject("roRegistrySection", "parental")
    return sec.Read("enabled") = "1"
end function

function SetParentalEnabled(enabled as Boolean) as Void
    sec = CreateObject("roRegistrySection", "parental")
    sec.Write("enabled", iif(enabled, "1", ""))
    sec.Flush()
end function

function HashParentalPin(pin as String, salt as String) as String
    digest = CreateObject("roEVPDigest")
    digest.Setup("sha256")
    ba = CreateObject("roByteArray")
    ba.FromAsciiString(salt + ":" + pin)
    return digest.Process(ba)
end function

function SaveParentalPin(pin as String) as Void
    di = CreateObject("roDeviceInfo")
    salt = di.GetRandomUUID()
    sec = CreateObject("roRegistrySection", "parental")
    sec.Write("salt", salt)
    sec.Write("pin_hash", HashParentalPin(pin, salt))
    sec.Flush()
end function

function VerifyParentalPin(pin as String) as Boolean
    sec = CreateObject("roRegistrySection", "parental")
    salt = sec.Read("salt")
    stored = sec.Read("pin_hash")
    if salt = "" or stored = "" then return false
    return HashParentalPin(pin, salt) = stored
end function

function StripDiacritics(s as String) as String
    result = s
    result = result.Replace("á", "a")
    result = result.Replace("Á", "a")
    result = result.Replace("à", "a")
    result = result.Replace("À", "a")
    result = result.Replace("é", "e")
    result = result.Replace("É", "e")
    result = result.Replace("è", "e")
    result = result.Replace("È", "e")
    result = result.Replace("í", "i")
    result = result.Replace("Í", "i")
    result = result.Replace("ì", "i")
    result = result.Replace("Ì", "i")
    result = result.Replace("ó", "o")
    result = result.Replace("Ó", "o")
    result = result.Replace("ò", "o")
    result = result.Replace("Ò", "o")
    result = result.Replace("ú", "u")
    result = result.Replace("Ú", "u")
    result = result.Replace("ù", "u")
    result = result.Replace("Ù", "u")
    result = result.Replace("ü", "u")
    result = result.Replace("Ü", "u")
    result = result.Replace("ñ", "n")
    result = result.Replace("Ñ", "n")
    return result
end function

function IsAdultCategoryName(name as String) as Boolean
    lower = lcase(StripDiacritics(name))
    keywords = ["adult", "xxx", "porn", "eroti", "18+", "+18"]
    for each kw in keywords
        if instr(lower, kw) > 0 then return true
    end for
    return false
end function

function BlockedByParental(categoryName as String) as Boolean
    if not IsParentalEnabled() then return false
    return IsAdultCategoryName(categoryName)
end function

function LoadContinueList() as Object
    sec = CreateObject("roRegistrySection", "continuar")
    json = sec.Read("items")
    if json = "" then return []
    parsed = ParseJSON(json)
    if parsed = invalid then return []
    return parsed
end function

function SaveContinueEntry(entry as Object) as Void
    profileId = GetActiveProfileId()
    entry["profileId"] = profileId
    items = LoadContinueList()
    rest = []
    for each item in items
        sameKey = SafeStr(item["key"]) = SafeStr(entry["key"])
        owned = item["profileId"] = invalid or item["profileId"] = profileId
        if not (sameKey and owned) then rest.Push(item)
    end for

    newItems = [entry]
    synced = []
    for each item in rest
        if item["syncedAt"] = invalid
            newItems.Push(item)
        else
            synced.Push(item)
        end if
    end for
    for each item in synced
        if newItems.Count() >= 10 then exit for
        newItems.Push(item)
    end for

    sec = CreateObject("roRegistrySection", "continuar")
    sec.Write("items", FormatJSON(newItems))
    sec.Flush()
end function

function RemoveContinueEntry(key as String) as Void
    profileId = GetActiveProfileId()
    items = LoadContinueList()
    newItems = []
    for each item in items
        sameKey = SafeStr(item["key"]) = key
        owned = item["profileId"] = invalid or item["profileId"] = profileId
        if sameKey and owned
            item["deletedAt"] = NowEpochMs()
            item["updatedAt"] = NowEpochMs()
            item["syncedAt"] = invalid
            item["profileId"] = profileId
        end if
        newItems.Push(item)
    end for
    sec = CreateObject("roRegistrySection", "continuar")
    sec.Write("items", FormatJSON(newItems))
    sec.Flush()
end function

sub MarkAllContinueEntriesSynced(profileId as String) as Void
    items = LoadContinueList()
    changed = false
    now = NowEpochMs()
    for each item in items
        owned = item["profileId"] = invalid or item["profileId"] = profileId
        if item["syncedAt"] = invalid and owned
            item["syncedAt"] = now
            item["profileId"] = profileId
            changed = true
        end if
    end for
    if changed
        sec = CreateObject("roRegistrySection", "continuar")
        sec.Write("items", FormatJSON(items))
        sec.Flush()
    end if
end sub

function ProgressPositionKey(profileId as String, key as String) as String
    return profileId + ":" + key
end function

' --- Sincronización multi-dispositivo ---

function GetDeviceId() as String
    sec = CreateObject("roRegistrySection", "sync")
    id = sec.Read("device_id")
    if id <> "" then return id
    di = CreateObject("roDeviceInfo")
    id = di.GetRandomUUID()
    sec.Write("device_id", id)
    sec.Flush()
    return id
end function

function GetSyncSecret() as String
    sec = CreateObject("roRegistrySection", "sync")
    return sec.Read("account_secret")
end function

sub SaveSyncSecret(secret as String) as Void
    sec = CreateObject("roRegistrySection", "sync")
    sec.Write("account_secret", secret)
    sec.Flush()
end sub

sub ClearSyncSecret() as Void
    sec = CreateObject("roRegistrySection", "sync")
    sec.Delete("account_secret")
    sec.Flush()
end sub

function GetActiveProfileId() as String
    sec = CreateObject("roRegistrySection", "sync")
    return sec.Read("active_profile_id")
end function

sub SetActiveProfileId(profileId as String) as Void
    sec = CreateObject("roRegistrySection", "sync")
    sec.Write("active_profile_id", profileId)
    sec.Flush()
end sub

function GetSyncCursor() as String
    sec = CreateObject("roRegistrySection", "sync")
    cursor = sec.Read("cursor")
    if cursor = "" then return "0"
    return cursor
end function

sub SetSyncCursor(cursor as String) as Void
    sec = CreateObject("roRegistrySection", "sync")
    sec.Write("cursor", cursor)
    sec.Flush()
end sub

function LoadProfiles() as Object
    sec = CreateObject("roRegistrySection", "profiles")
    json = sec.Read("items")
    if json = "" then return []
    parsed = ParseJSON(json)
    if parsed = invalid then return []
    return parsed
end function

sub SaveProfiles(profiles as Object) as Void
    sec = CreateObject("roRegistrySection", "profiles")
    rev = sec.Read("rev")
    if rev = "" then rev = "0"
    sec.Write("items", FormatJSON(profiles))
    sec.Write("rev", (Val(rev) + 1).ToStr())
    sec.Flush()
end sub

function LoadProfilesRev() as String
    sec = CreateObject("roRegistrySection", "profiles")
    rev = sec.Read("rev")
    if rev = "" then return "0"
    return rev
end function

function SaveProfilesCAS(profiles as Object, expectedRev as String) as Boolean
    sec = CreateObject("roRegistrySection", "profiles")
    currentRev = sec.Read("rev")
    if currentRev = "" then currentRev = "0"
    if currentRev <> expectedRev then return false
    sec.Write("items", FormatJSON(profiles))
    sec.Write("rev", (Val(currentRev) + 1).ToStr())
    sec.Flush()
    return true
end function

function UpsertProfile(id as String, nombre as String) as Object
    for attempt = 1 to 5
        rev = LoadProfilesRev()
        profiles = LoadProfiles()
        newProfiles = []
        found = invalid
        for each p in profiles
            if SafeStr(p["id"]) = id
                p["nombre"] = nombre
                found = p
            end if
            newProfiles.Push(p)
        end for
        if found = invalid
            found = {id: id, nombre: nombre}
            newProfiles.Push(found)
        end if
        if attempt = 5
            SaveProfiles(newProfiles)
            return found
        end if
        if SaveProfilesCAS(newProfiles, rev) then return found
    end for
    return found
end function

sub DeleteLocalProfile(id as String) as Void
    for attempt = 1 to 5
        rev = LoadProfilesRev()
        profiles = LoadProfiles()
        newProfiles = []
        for each p in profiles
            if SafeStr(p["id"]) <> id then newProfiles.Push(p)
        end for
        if attempt = 5
            SaveProfiles(newProfiles)
            return
        end if
        if SaveProfilesCAS(newProfiles, rev) then return
    end for
end sub

' Epoch en milisegundos (LongInteger: segundos*1000 desborda un Integer de 32
' bits). Usado solo para timestamps de sync (lastWatchedAt/createdAt), que en
' el resto de plataformas (web/mobile/tizen) y el servidor son siempre ms.
function NowEpochMs() as LongInteger
    dt = CreateObject("roDateTime")
    return dt.AsSeconds() * 1000&
end function
