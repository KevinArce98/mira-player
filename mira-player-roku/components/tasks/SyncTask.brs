sub init()
    m.top.FunctionName = "runSyncJob"
end sub

function HttpRequest(method as String, url as String, headers as Object, bodyStr as String) as Object
    http = CreateObject("roUrlTransfer")
    http.SetUrl(url)
    http.SetCertificatesFile("common:/certs/ca-bundle.crt")
    http.InitClientCertificates()
    for each k in headers
        http.AddHeader(k, headers[k])
    end for

    port = CreateObject("roMessagePort")
    http.SetMessagePort(port)

    ok = false
    if method = "POST"
        ok = http.AsyncPostFromString(bodyStr)
    else
        ok = http.AsyncGetToString()
    end if
    if not ok then return invalid

    event = wait(15000, port)
    if event = invalid
        http.AsyncCancel()
        return invalid
    end if

    code = event.GetResponseCode()
    body = event.GetString()
    data = invalid
    if body <> "" then data = ParseJSON(body)
    return {status: code, data: data}
end function

function HttpPostJson(url as String, headers as Object, payload as Object) as Object
    h = {}
    for each k in headers
        h[k] = headers[k]
    end for
    h["Content-Type"] = "application/json"
    return HttpRequest("POST", url, h, FormatJSON(payload))
end function

function HttpGetJson(url as String, headers as Object) as Object
    return HttpRequest("GET", url, headers, "")
end function

function AuthHeader(secret as String) as Object
    return {"Authorization": "Bearer " + secret}
end function

sub runSyncJob()
    baseUrl = SyncBaseUrl()
    if baseUrl = "" then return

    creds = m.top.credentials
    if creds = invalid then return

    secret = GetSyncSecret()

    if secret = ""
        if not doResolve(baseUrl, creds) then return
        secret = GetSyncSecret()
    end if

    profileId = GetActiveProfileId()
    if profileId = "" then return

    pushOk = doPush(baseUrl, secret, profileId)
    if pushOk = false
        ClearSyncSecret()
        if not doResolve(baseUrl, creds) then return
        secret = GetSyncSecret()
        profileId = GetActiveProfileId()
        if profileId = "" then return
        doPush(baseUrl, secret, profileId)
    end if

    doPull(baseUrl, secret, profileId)
end sub

function doResolve(baseUrl as String, creds as Object) as Boolean
    deviceId = GetDeviceId()
    body = {
        servidor: creds.server,
        usuario: creds.username,
        password: creds.password,
        deviceId: deviceId,
        platform: "roku"
    }
    res = HttpPostJson(baseUrl + "/account/resolve", {}, body)
    if res = invalid or res.data = invalid then return false
    data = res.data
    if data.DoesExist("error") then return false

    SaveSyncSecret(SafeStr(data.accountSecret))

    serverIds = {}
    serverProfiles = data.profiles
    if serverProfiles <> invalid
        for each sp in serverProfiles
            pid = SafeStr(sp.id)
            serverIds[pid] = true
            UpsertProfile(pid, SafeStr(sp.nombre))
        end for
    end if

    profiles = LoadProfiles()
    activeId = GetActiveProfileId()
    validActive = false
    for each p in profiles
        if SafeStr(p["id"]) = activeId then validActive = true
    end for

    if not validActive
        if profiles.Count() > 0
            activeId = SafeStr(profiles[0]["id"])
        else
            di = CreateObject("roDeviceInfo")
            activeId = di.GetRandomUUID()
            UpsertProfile(activeId, "Principal")
        end if
        SetActiveProfileId(activeId)
    end if

    profiles = LoadProfiles()
    for each p in profiles
        pid = SafeStr(p["id"])
        if not serverIds.DoesExist(pid)
            HttpPostJson(baseUrl + "/profiles", AuthHeader(SafeStr(data.accountSecret)), {id: pid, nombre: SafeStr(p["nombre"])})
        end if
    end for

    return true
end function

function doPush(baseUrl as String, secret as String, profileId as String) as Boolean
    continueItems = LoadContinueList()
    progressArr = []
    for each entry in continueItems
        key = SafeStr(entry["key"])
        isCanonical = (Left(key, 6) = "movie:") or (Left(key, 5) = "live:") or (Left(key, 7) = "series:")
        if key <> "" and isCanonical
            durationSecs = entry["durationSecs"]
            if durationSecs = invalid then durationSecs = 0
            updatedAt = entry["updatedAt"]
            if updatedAt = invalid then updatedAt = NowEpochSeconds()
            sec = CreateObject("roRegistrySection", "progress")
            posStr = sec.Read(key)
            posVal = 0
            if posStr <> "" then posVal = Val(posStr)
            duracionTotal = invalid
            if durationSecs > 0 then duracionTotal = durationSecs
            progressArr.Push({canonicalKey: key, posicionSegundos: int(posVal), duracionTotal: duracionTotal, completado: false, lastWatchedAt: updatedAt, deletedAt: invalid})
        end if
    end for

    favs = LoadFavorites()
    favArr = []
    for each fav in favs
        if type(fav) = "roAssociativeArray"
            ftype = SafeStr(fav["type"])
            sid = SafeStr(fav["stream_id"])
            serId = SafeStr(fav["series_id"])
            canonicalId = sid
            if ftype = "series" and serId <> "" then canonicalId = serId
            if ftype <> "" and canonicalId <> ""
                favArr.Push({canonicalKey: ftype + ":" + canonicalId, createdAt: NowEpochSeconds(), deletedAt: invalid})
            end if
        end if
    end for

    if progressArr.Count() = 0 and favArr.Count() = 0 then return true

    body = {profileId: profileId, progress: progressArr, favorites: favArr}
    res = HttpPostJson(baseUrl + "/sync/push", AuthHeader(secret), body)
    if res = invalid then return false
    if res.status = 401 then return false
    return true
end function

sub doPull(baseUrl as String, secret as String, profileId as String)
    cursor = GetSyncCursor()
    url = baseUrl + "/sync/pull?profileId=" + profileId + "&since=" + cursor
    res = HttpGetJson(url, AuthHeader(secret))
    if res = invalid or res.data = invalid then return
    data = res.data
    if data.DoesExist("error") then return

    if data.progress <> invalid
        for each item in data.progress
            applyPulledProgress(item)
        end for
    end if
    if data.favorites <> invalid
        for each item in data.favorites
            applyPulledFavorite(item)
        end for
    end if

    if data.cursor <> invalid
        SetSyncCursor(data.cursor.ToStr())
    end if
end sub

' Solo actualiza/borra progreso de contenido que YA existe localmente (visto
' antes en este Roku). No puede "descubrir" contenido nuevo favorito/visto en
' otro dispositivo porque este cliente no mantiene un catálogo local propio
' con el que reconstruir nombre/poster/URL a partir del canonicalKey.
sub applyPulledProgress(item as Object)
    key = SafeStr(item.canonicalKey)
    if key = "" then return

    items = LoadContinueList()
    match = invalid
    for each e in items
        if SafeStr(e["key"]) = key then match = e
    end for
    if match = invalid then return

    if item.deletedAt <> invalid
        RemoveContinueEntry(key)
        sec = CreateObject("roRegistrySection", "progress")
        sec.Delete(key)
        sec.Flush()
        return
    end if

    posVal = item.posicionSegundos
    sec = CreateObject("roRegistrySection", "progress")
    curStr = sec.Read(key)
    curVal = 0
    if curStr <> "" then curVal = Val(curStr)
    if posVal > curVal
        sec.Write(key, Str(posVal))
        sec.Flush()
    end if

    match["updatedAt"] = item.lastWatchedAt
    SaveContinueEntry(match)
end sub

' Misma limitación que applyPulledProgress: solo aplica tombstones (borrados)
' sobre favoritos ya conocidos localmente.
sub applyPulledFavorite(item as Object)
    if item.deletedAt = invalid then return
    key = SafeStr(item.canonicalKey)
    if key = "" then return
    parts = key.Split(":")
    if parts.Count() < 2 then return
    ftype = parts[0]
    fid = parts[1]

    favs = LoadFavorites()
    matchId = invalid
    for each fav in favs
        if type(fav) = "roAssociativeArray"
            sid = SafeStr(fav["stream_id"])
            serId = SafeStr(fav["series_id"])
            favType = SafeStr(fav["type"])
            cid = sid
            if favType = "series" and serId <> "" then cid = serId
            if favType = ftype and cid = fid then matchId = SafeStr(fav["id"])
        end if
    end for
    if matchId = invalid then return

    newFavs = []
    for each fav in favs
        favId = iif(type(fav) = "roAssociativeArray", SafeStr(fav["id"]), SafeStr(fav))
        if favId <> matchId then newFavs.Push(fav)
    end for
    SaveFavorites(newFavs)
end sub
