sub init()
    m.titleLabel = m.top.FindNode("titleLabel")
    m.metaLabel = m.top.FindNode("metaLabel")
    m.genreLabel = m.top.FindNode("genreLabel")
    m.descLabel = m.top.FindNode("descLabel")
    m.castLabel = m.top.FindNode("castLabel")
    m.poster = m.top.FindNode("poster")
    m.playBtn = m.top.FindNode("playBtn")
    m.favBtn = m.top.FindNode("favBtn")
    m.favBtnLabel = m.top.FindNode("favBtnLabel")
    m.episodePanel = m.top.FindNode("episodePanel")
    m.episodeBorder = m.top.FindNode("episodeBorder")
    m.episodeList = m.top.FindNode("episodeList")
    m.seasonLabel = m.top.FindNode("seasonLabel")
    m.spinner = m.top.FindNode("spinner")

    m.focusIndex = 0
    m.seasons = {}
    m.seasonKeys = []
    m.currentSeasonIdx = 0
    m.allEpisodes = []
    m.wentToPlayer = false

    m.task = CreateObject("roSGNode", "XtreamTask")
    m.task.ObserveField("response", "onDetailLoaded")

    m.episodeList.ObserveField("itemSelected", "onEpisodeSelected")
    m.top.ObserveField("contentData", "onDataSet")
    m.top.ObserveField("focusedChild", "onFocusChanged")
end sub

sub onFocusChanged()
    if not m.top.IsInFocusChain() then return
    if m.wentToPlayer
        m.wentToPlayer = false
        m.focusIndex = 0
        updateFocus()
    end if
end sub

sub onDataSet()
    item = m.top.contentData
    if item = invalid then return
    m.task.credentials = m.top.credentials

    m.titleLabel.text = CleanText(SafeStr(item["name"]))
    if m.top.contentType = "series"
        m.poster.uri = SafeStr(item["cover"])
        if m.poster.uri = "" then m.poster.uri = SafeStr(item["stream_icon"])
    else
        m.poster.uri = SafeStr(item["stream_icon"])
        if m.poster.uri = "" then m.poster.uri = SafeStr(item["cover"])
    end if

    streamId = getContentId(item)
    isFav = IsFavorite(streamId)
    m.favBtnLabel.text = iif(isFav, "Favorito (si)", "Favorito")
    m.favBtnLabel.color = iif(isFav, "0xD4AA7DFF", "0xF3EEE6FF")

    if m.top.contentType = "movie"
        loadMovieInfo(item)
    else
        loadSeriesInfo(item)
    end if

    updateFocus()
end sub

sub loadMovieInfo(item as Object)
    vodId = SafeStr(item["stream_id"])
    if vodId = "" then return
    m.spinner.visible = true
    m.task.request = {action: "get_vod_info", vod_id: vodId}
    m.pendingType = "vod"
end sub

sub loadSeriesInfo(item as Object)
    seriesId = SafeStr(item["series_id"])
    if seriesId = "" then return
    m.spinner.visible = true
    m.task.request = {action: "get_series_info", series_id: seriesId}
    m.pendingType = "series"
end sub

sub onDetailLoaded()
    m.spinner.visible = false
    response = m.task.response
    if not response.success then return

    if m.pendingType = "vod"
        info = response.data["info"]
        if info = invalid then return
        year = SafeStr(info["releasedate"])
        if len(year) >= 4 then year = left(year, 4)
        duration = SafeStr(info["duration"])
        m.metaLabel.text = year + iif(duration <> "", "  ·  " + duration, "")
        m.genreLabel.text = SafeStr(info["genre"])
        m.descLabel.text = SafeStr(info["plot"])
        cast = SafeStr(info["cast"])
        if cast <> "" then m.castLabel.text = "Reparto: " + cast
    else if m.pendingType = "series"
        info = response.data["info"]
        episodes = response.data["episodes"]
        if info <> invalid
            m.genreLabel.text = SafeStr(info["genre"])
            m.descLabel.text = SafeStr(info["plot"])
            cast = SafeStr(info["cast"])
            if cast <> "" then m.castLabel.text = "Reparto: " + cast
        end if
        if episodes <> invalid
            buildSeasonEpisodes(episodes)
        end if
    end if
end sub

sub buildSeasonEpisodes(episodes as Object)
    m.seasons = episodes
    m.seasonKeys = sortSeasonKeys(episodes.Keys())
    m.currentSeasonIdx = 0
    m.episodePanel.visible = true
    m.episodeBorder.visible = true
    if m.seasonKeys.Count() = 0 then return
    showSeason(m.seasonKeys[0])
end sub

sub showSeason(seasonKey as String)
    total = m.seasonKeys.Count()
    prefix = iif(m.currentSeasonIdx > 0, "< ", "  ")
    suffix = iif(m.currentSeasonIdx < total - 1, " >", "  ")
    m.seasonLabel.text = prefix + "Temporada " + seasonKey + suffix

    epList = m.seasons[seasonKey]
    if epList = invalid then return

    m.allEpisodes = epList
    content = CreateObject("roSGNode", "ContentNode")
    for each ep in epList
        row = CreateObject("roSGNode", "ContentNode")
        epNum = SafeStr(ep["episode_num"])
        title = CleanText(SafeStr(ep["title"]))
        row.title = "  Ep. " + epNum + iif(title <> "", "  " + title, "")
        content.AppendChild(row)
    end for
    m.episodeList.content = content
end sub

function sortSeasonKeys(keys as Object) as Object
    sorted = []
    for each k in keys
        sorted.Push(k)
    end for
    n = sorted.Count()
    i = 1
    while i < n
        key = sorted[i]
        keyInt = key.ToInt()
        j = i - 1
        while j >= 0 and sorted[j].ToInt() > keyInt
            sorted[j + 1] = sorted[j]
            j = j - 1
        end while
        sorted[j + 1] = key
        i = i + 1
    end while
    return sorted
end function

sub onEpisodeSelected(event as Object)
    idx = event.GetData()
    if m.allEpisodes = invalid then return
    ep = m.allEpisodes[idx]
    creds = m.top.credentials
    episodeId = SafeStr(ep["id"])
    ext = SafeStr(ep["container_extension"])
    url = SeriesStreamUrl(creds.server, creds.username, creds.password, episodeId, ext)
    title = m.top.contentData["name"] + " - Ep. " + SafeStr(ep["episode_num"])
    seriesId = SafeStr(m.top.contentData["series_id"])
    queue = buildEpisodeQueue(m.currentSeasonIdx, idx)
    m.wentToPlayer = true
    m.top.navigate = {
        screen: "PlayerScreen",
        params: {
            streamUrl: url,
            contentTitle: title,
            credentials: creds,
            posterUrl: m.poster.uri,
            episodeQueue: queue,
            episodeIndex: 0,
            mediaKind: "series",
            mediaId: seriesId,
            season: Val(m.seasonKeys[m.currentSeasonIdx]),
            episodeNum: Val(SafeStr(ep["episode_num"]))
        }
    }
end sub

function buildEpisodeQueue(startSeasonIdx as Integer, startEpIdx as Integer) as Object
    queue = []
    creds = m.top.credentials
    seriesName = SafeStr(m.top.contentData["name"])
    seriesId = SafeStr(m.top.contentData["series_id"])
    si = startSeasonIdx
    while si < m.seasonKeys.Count()
        epList = m.seasons[m.seasonKeys[si]]
        ei = 0
        if si = startSeasonIdx then ei = startEpIdx
        while ei < epList.Count()
            ep = epList[ei]
            episodeId = SafeStr(ep["id"])
            ext = SafeStr(ep["container_extension"])
            url = SeriesStreamUrl(creds.server, creds.username, creds.password, episodeId, ext)
            title = seriesName + " - Ep. " + SafeStr(ep["episode_num"])
            queue.Push({
                title: title,
                url: url,
                seriesId: seriesId,
                season: Val(m.seasonKeys[si]),
                episodeNum: Val(SafeStr(ep["episode_num"]))
            })
            ei = ei + 1
        end while
        si = si + 1
    end while
    return queue
end function

sub updateFocus()
    m.playBtn.blendColor = "0x323230FF"
    m.favBtn.blendColor = "0x323230FF"

    if m.focusIndex = 0
        m.playBtn.blendColor = "0xD4AA7DFF"
    else if m.focusIndex = 1
        m.favBtn.blendColor = "0x323230FF"
    else if m.focusIndex = 2
        m.episodeList.SetFocus(true)
        return
    end if
    m.top.SetFocus(true)
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if key = "back"
        if m.focusIndex = 2
            m.focusIndex = 0
            updateFocus()
            return true
        end if
        m.top.navigate = {screen: "back", params: {}}
        return true
    end if

    if key = "right"
        if m.focusIndex = 2
            if m.currentSeasonIdx < m.seasonKeys.Count() - 1
                m.currentSeasonIdx++
                showSeason(m.seasonKeys[m.currentSeasonIdx])
            end if
            return true
        end if
        if m.focusIndex < 1
            m.focusIndex++
            updateFocus()
            return true
        end if
    else if key = "left"
        if m.focusIndex = 2
            if m.currentSeasonIdx > 0
                m.currentSeasonIdx--
                showSeason(m.seasonKeys[m.currentSeasonIdx])
            end if
            return true
        end if
        if m.focusIndex > 0
            m.focusIndex--
            updateFocus()
            return true
        end if
    else if key = "down"
        if m.top.contentType = "series" and m.episodePanel.visible
            m.focusIndex = 2
            updateFocus()
            return true
        end if
    else if key = "up"
        if m.focusIndex = 2
            m.focusIndex = 0
            updateFocus()
            return true
        end if
    else if key = "OK"
        if m.focusIndex = 0
            playContent()
        else if m.focusIndex = 1
            toggleFav()
        end if
        return true
    end if

    return false
end function

sub playContent()
    item = m.top.contentData
    creds = m.top.credentials
    streamId = SafeStr(item["stream_id"])
    ext = SafeStr(item["container_extension"])
    url = MovieStreamUrl(creds.server, creds.username, creds.password, streamId, ext)
    m.wentToPlayer = true
    m.top.navigate = {
        screen: "PlayerScreen",
        params: {
            streamUrl: url,
            contentTitle: SafeStr(item["name"]),
            credentials: creds,
            posterUrl: m.poster.uri,
            mediaKind: "movie",
            mediaId: streamId
        }
    }
end sub

sub toggleFav()
    item = m.top.contentData
    id = getContentId(item)
    if id = "" then return
    isFav = ToggleFavorite(id, m.top.contentType, item)
    m.favBtnLabel.text = iif(isFav, "Favorito (si)", "Favorito")
    m.favBtnLabel.color = iif(isFav, "0xD4AA7DFF", "0xF3EEE6FF")
    RunSync(m.top)
end sub

function getContentId(item as Object) as String
    if m.top.contentType = "series"
        return SafeStr(item["series_id"])
    end if
    return SafeStr(item["stream_id"])
end function
