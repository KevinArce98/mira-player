sub init()
    m.top.FunctionName = "runSyncJob"
end sub

function HttpRequest(method as String, url as String, headers as Object, bodyStr as String) as Object
    http = CreateObject("roUrlTransfer")
    http.SetUrl(url)
    http.SetCertificatesFile("common:/certs/ca-bundle.crt")
    http.InitClientCertificates()
    http.EnableEncodings(true)
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

    doPullProfiles(baseUrl, secret)
    doPull(baseUrl, secret, profileId, creds)
end sub

' Adopta el perfil canónico (isDefault) que crea el servidor para la cuenta.
' No empuja un perfil local propio: perfiles nuevos creados en este
' dispositivo se envían al servidor desde ProfileScreen al crearse (ver
' onAddClosed), no desde aquí.
function doResolve(baseUrl as String, creds as Object) as Boolean
    deviceId = GetDeviceId()
    body = {
        "servidor": creds.server,
        "usuario": creds.username,
        "password": creds.password,
        "deviceId": deviceId,
        "platform": "roku"
    }
    res = HttpPostJson(baseUrl + "/account/resolve", {}, body)
    if res = invalid or res.data = invalid then return false
    data = res.data
    if data.DoesExist("error") then return false

    SaveSyncSecret(SafeStr(data.accountSecret))

    serverProfiles = data.profiles
    if serverProfiles = invalid or serverProfiles.Count() = 0 then return false

    serverIds = {}
    canonical = invalid
    for each sp in serverProfiles
        pid = SafeStr(sp.id)
        serverIds[pid] = true
        UpsertProfile(pid, SafeStr(sp.nombre))
        if sp.DoesExist("isDefault") and sp.isDefault = true then canonical = sp
    end for
    if canonical = invalid then canonical = serverProfiles[0]

    for each p in LoadProfiles()
        pid = SafeStr(p["id"])
        if not serverIds.DoesExist(pid) then DeleteLocalProfile(pid)
    end for

    SetActiveProfileId(SafeStr(canonical.id))
    SetSyncCursor("0")

    return true
end function

' Reconciliación de perfiles en cada sync (no solo al resolver): aplica altas
' y bajas del servidor, y empuja perfiles creados localmente que el servidor
' aún no conoce (ej. si el push inmediato en ProfileScreen falló por red).
sub doPullProfiles(baseUrl as String, secret as String) as Void
    res = HttpGetJson(baseUrl + "/profiles", AuthHeader(secret))
    if res = invalid or res.data = invalid then return
    profiles = res.data.profiles
    if profiles = invalid then return

    serverIds = {}
    for each p in profiles
        pid = SafeStr(p.id)
        serverIds[pid] = true
        if p.DoesExist("deletedAt") and p.deletedAt <> invalid
            DeleteLocalProfile(pid)
        else
            UpsertProfile(pid, SafeStr(p.nombre))
        end if
    end for

    remaining = LoadProfiles()
    active = GetActiveProfileId()
    validActive = false
    for each p in remaining
        if SafeStr(p["id"]) = active then validActive = true
    end for
    if not validActive and remaining.Count() > 0
        SetActiveProfileId(SafeStr(remaining[0]["id"]))
    end if

    for each p in remaining
        pid = SafeStr(p["id"])
        if not serverIds.DoesExist(pid)
            HttpPostJson(baseUrl + "/profiles", AuthHeader(secret), {id: pid, nombre: SafeStr(p["nombre"])})
        end if
    end for
end sub

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
            if updatedAt = invalid then updatedAt = NowEpochMs()
            completadoVal = entry["completado"]
            if completadoVal <> true then completadoVal = false
            sec = CreateObject("roRegistrySection", "progress")
            posStr = sec.Read(key)
            posVal = 0
            if posStr <> "" then posVal = Val(posStr)
            duracionTotal = invalid
            if durationSecs > 0 then duracionTotal = durationSecs
            progressArr.Push({"canonicalKey": key, "posicionSegundos": int(posVal), "duracionTotal": duracionTotal, "completado": completadoVal, "lastWatchedAt": updatedAt, "deletedAt": invalid})
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
                favArr.Push({"canonicalKey": ftype + ":" + canonicalId, "createdAt": NowEpochMs(), "deletedAt": invalid})
            end if
        end if
    end for

    if progressArr.Count() = 0 and favArr.Count() = 0 then return true

    body = {"profileId": profileId, "progress": progressArr, "favorites": favArr}
    res = HttpPostJson(baseUrl + "/sync/push", AuthHeader(secret), body)
    if res = invalid then return false
    if res.status = 401 then return false
    return true
end function

' El cursor solo avanza si TODO el batch resolvió (igual que web/mobile/tizen):
' si algo no se pudo reconstruir vía Xtream (ej. el proveedor no responde),
' se reintenta el batch completo en el próximo sync en vez de perderlo.
sub doPull(baseUrl as String, secret as String, profileId as String, creds as Object)
    cursor = GetSyncCursor()
    url = baseUrl + "/sync/pull?profileId=" + profileId + "&since=" + cursor
    res = HttpGetJson(url, AuthHeader(secret))
    if res = invalid or res.data = invalid then return
    data = res.data
    if data.DoesExist("error") then return

    allResolved = true

    if data.progress <> invalid
        for each item in data.progress
            if not applyPulledProgress(creds, item) then allResolved = false
        end for
    end if
    if data.favorites <> invalid
        for each item in data.favorites
            if not applyPulledFavorite(creds, item) then allResolved = false
        end for
    end if

    if allResolved and data.cursor <> invalid
        SetSyncCursor(data.cursor.ToStr())
    end if
end sub

function FetchSeriesInfo(creds as Object, seriesId as String) as Object
    url = BuildApiUrl(creds.server, creds.username, creds.password, {action: "get_series_info", series_id: seriesId})
    res = HttpGetJson(url, {})
    if res = invalid or res.data = invalid then return invalid
    return res.data
end function

function ResolveMovieItem(creds as Object, vodId as String) as Object
    url = BuildApiUrl(creds.server, creds.username, creds.password, {action: "get_vod_info", vod_id: vodId})
    res = HttpGetJson(url, {})
    if res = invalid or res.data = invalid then return invalid
    data = res.data
    movieData = data["movie_data"]
    if movieData = invalid then return invalid

    name = SafeStr(movieData["name"])
    ext = SafeStr(movieData["container_extension"])
    if ext = "" then ext = "mp4"
    icon = ""
    info = data["info"]
    if info <> invalid then icon = SafeStr(info["movie_image"])

    return {name: name, ext: ext, icon: icon}
end function

function ResolveSeriesEpisode(creds as Object, seriesId as String, season as Integer, episodeNum as Integer) as Object
    data = FetchSeriesInfo(creds, seriesId)
    if data = invalid then return invalid
    episodes = data["episodes"]
    if episodes = invalid then return invalid
    seasonEps = episodes[season.ToStr()]
    if seasonEps = invalid then return invalid

    ep = invalid
    for each e in seasonEps
        if SafeInt(e["episode_num"]) = episodeNum then ep = e
    end for
    if ep = invalid then return invalid

    info = data["info"]
    seriesName = ""
    icon = ""
    if info <> invalid
        seriesName = SafeStr(info["name"])
        icon = SafeStr(info["cover"])
    end if
    epTitle = SafeStr(ep["title"])
    title = seriesName
    if epTitle <> "" then title = title + " - " + epTitle

    ext = SafeStr(ep["container_extension"])
    if ext = "" then ext = "mp4"

    return {title: title, episodeId: SafeStr(ep["id"]), ext: ext, icon: icon}
end function

function ResolveSeriesBasicInfo(creds as Object, seriesId as String) as Object
    data = FetchSeriesInfo(creds, seriesId)
    if data = invalid then return invalid
    info = data["info"]
    if info = invalid then return invalid
    return {name: SafeStr(info["name"]), icon: SafeStr(info["cover"])}
end function

function IsFavoriteMatch(fav as Object, ftype as String, fid as String) as Boolean
    if type(fav) <> "roAssociativeArray" then return false
    favType = SafeStr(fav["type"])
    if favType <> ftype then return false
    sid = SafeStr(fav["stream_id"])
    serId = SafeStr(fav["series_id"])
    cid = sid
    if favType = "series" and serId <> "" then cid = serId
    return cid = fid
end function

' Actualiza progreso ya conocido localmente, o lo reconstruye vía Xtream
' (nombre/URL/portada) si este dispositivo nunca vio ese contenido — así se
' puede RECIBIR "continuar viendo" marcado en otro dispositivo, no solo
' actualizar lo que ya existía aquí. Devuelve false si no se pudo resolver
' (para reintentar en el próximo sync sin perder el item).
function applyPulledProgress(creds as Object, item as Object) as Boolean
    key = SafeStr(item.canonicalKey)
    if key = "" then return false

    parts = key.Split(":")
    kind = parts[0]
    if kind = "live" then return true

    items = LoadContinueList()
    match = invalid
    for each e in items
        if SafeStr(e["key"]) = key then match = e
    end for

    if item.deletedAt <> invalid
        if match <> invalid then RemoveContinueEntry(key)
        sec = CreateObject("roRegistrySection", "progress")
        sec.Delete(key)
        sec.Flush()
        return true
    end if

    if match = invalid
        if kind = "movie" and parts.Count() = 2
            info = ResolveMovieItem(creds, parts[1])
            if info = invalid then return false
            url = MovieStreamUrl(creds.server, creds.username, creds.password, parts[1], info.ext)
            match = {
                key: key,
                title: info.name,
                url: url,
                icon: info.icon,
                mediaKind: "movie",
                mediaId: parts[1],
                season: invalid,
                episodeNum: invalid,
                durationSecs: 0,
                completado: false
            }
        else if kind = "series" and parts.Count() = 4
            seasonNum = Val(parts[2])
            epNum = Val(parts[3])
            info = ResolveSeriesEpisode(creds, parts[1], seasonNum, epNum)
            if info = invalid then return false
            url = SeriesStreamUrl(creds.server, creds.username, creds.password, info.episodeId, info.ext)
            match = {
                key: key,
                title: info.title,
                url: url,
                icon: info.icon,
                mediaKind: "series",
                mediaId: parts[1],
                season: seasonNum,
                episodeNum: epNum,
                durationSecs: 0,
                completado: false
            }
        else
            return false
        end if
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

    if item.duracionTotal <> invalid then match["durationSecs"] = item.duracionTotal
    match["updatedAt"] = item.lastWatchedAt
    match["completado"] = (item.completado = true)
    SaveContinueEntry(match)
    return true
end function

' Igual que applyPulledProgress: aplica tombstones sobre favoritos conocidos,
' y reconstruye vía Xtream los que este dispositivo no tenía (favoritos
' marcados en otro dispositivo). "live" no se reconstruye (Roku no soporta
' favoritos de canales en vivo), se trata como resuelto para no bloquear el
' cursor con algo que este cliente nunca podrá aplicar.
function applyPulledFavorite(creds as Object, item as Object) as Boolean
    key = SafeStr(item.canonicalKey)
    if key = "" then return false
    parts = key.Split(":")
    if parts.Count() < 2 then return false
    ftype = parts[0]
    fid = parts[1]

    favs = LoadFavorites()

    if item.deletedAt <> invalid
        matchId = invalid
        for each fav in favs
            if IsFavoriteMatch(fav, ftype, fid) then matchId = SafeStr(fav["id"])
        end for
        if matchId <> invalid
            newFavs = []
            for each fav in favs
                if type(fav) = "roAssociativeArray"
                    favId = SafeStr(fav["id"])
                else
                    favId = SafeStr(fav)
                end if
                if favId <> matchId then newFavs.Push(fav)
            end for
            SaveFavorites(newFavs)
        end if
        return true
    end if

    if ftype = "live" then return true

    for each fav in favs
        if IsFavoriteMatch(fav, ftype, fid) then return true
    end for

    di = CreateObject("roDeviceInfo")
    if ftype = "movie"
        info = ResolveMovieItem(creds, fid)
        if info = invalid then return false
        newFav = {
            id: di.GetRandomUUID(),
            type: "movie",
            name: info.name,
            icon: info.icon,
            stream_id: fid,
            series_id: "",
            container_extension: info.ext
        }
    else if ftype = "series"
        info = ResolveSeriesBasicInfo(creds, fid)
        if info = invalid then return false
        newFav = {
            id: di.GetRandomUUID(),
            type: "series",
            name: info.name,
            icon: info.icon,
            stream_id: "",
            series_id: fid,
            container_extension: ""
        }
    else
        return true
    end if

    favs.Push(newFav)
    SaveFavorites(favs)
    return true
end function
