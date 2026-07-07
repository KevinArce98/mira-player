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
    reg.DeleteSection("credentials")
    reg.DeleteSection("favorites")
    reg.DeleteSection("progress")
    reg.DeleteSection("browse")
    reg.DeleteSection("parental")
    reg.DeleteSection("continuar")
    reg.Flush()
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
    sec.Write("items", FormatJSON(items))
    sec.Flush()
end function

function IsFavorite(id as String) as Boolean
    favs = LoadFavorites()
    for each fav in favs
        favId = iif(type(fav) = "roAssociativeArray", SafeStr(fav["id"]), SafeStr(fav))
        if favId = id then return true
    end for
    return false
end function

function ToggleFavorite(id as String, contentType as String, item as Object) as Boolean
    favs = LoadFavorites()
    newFavs = []
    found = false
    for each fav in favs
        favId = iif(type(fav) = "roAssociativeArray", SafeStr(fav["id"]), SafeStr(fav))
        if favId = id
            found = true
        else
            newFavs.Push(fav)
        end if
    end for
    if not found
        icon = SafeStr(item["stream_icon"])
        if icon = "" then icon = SafeStr(item["cover"])
        newFavs.Push({
            id: id,
            type: contentType,
            name: SafeStr(item["name"]),
            icon: icon,
            stream_id: SafeStr(item["stream_id"]),
            series_id: SafeStr(item["series_id"]),
            container_extension: SafeStr(item["container_extension"])
        })
    end if
    SaveFavorites(newFavs)
    return not found
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

function IsAdultCategoryName(name as String) as Boolean
    lower = lcase(name)
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
    items = LoadContinueList()
    newItems = [entry]
    for each item in items
        if SafeStr(item["key"]) <> SafeStr(entry["key"]) and newItems.Count() < 10
            newItems.Push(item)
        end if
    end for
    sec = CreateObject("roRegistrySection", "continuar")
    sec.Write("items", FormatJSON(newItems))
    sec.Flush()
end function

function RemoveContinueEntry(key as String) as Void
    items = LoadContinueList()
    newItems = []
    for each item in items
        if SafeStr(item["key"]) <> key
            newItems.Push(item)
        end if
    end for
    sec = CreateObject("roRegistrySection", "continuar")
    sec.Write("items", FormatJSON(newItems))
    sec.Flush()
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
    sec.Write("items", FormatJSON(profiles))
    sec.Flush()
end sub

function UpsertProfile(id as String, nombre as String) as Object
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
    SaveProfiles(newProfiles)
    return found
end function

sub DeleteLocalProfile(id as String) as Void
    profiles = LoadProfiles()
    newProfiles = []
    for each p in profiles
        if SafeStr(p["id"]) <> id then newProfiles.Push(p)
    end for
    SaveProfiles(newProfiles)
end sub

' Epoch en milisegundos (LongInteger: segundos*1000 desborda un Integer de 32
' bits). Usado solo para timestamps de sync (lastWatchedAt/createdAt), que en
' el resto de plataformas (web/mobile/tizen) y el servidor son siempre ms.
function NowEpochMs() as LongInteger
    dt = CreateObject("roDateTime")
    return dt.AsSeconds() * 1000&
end function
