sub init()
    m.spinner = m.top.FindNode("spinner")
    m.errorLabel = m.top.FindNode("errorLabel")
    m.osd = m.top.FindNode("osd")
    m.osdTitle = m.top.FindNode("osdTitle")
    m.osdTime = m.top.FindNode("osdTime")
    m.liveLabel = m.top.FindNode("liveLabel")
    m.progressBar = m.top.FindNode("progressBar")

    m.nextOverlay = m.top.FindNode("nextOverlay")
    m.nextTitle = m.top.FindNode("nextTitle")
    m.nextCountdownLabel = m.top.FindNode("nextCountdown")
    m.nextPlayBtn = m.top.FindNode("nextPlayBtn")
    m.nextCancelBtn = m.top.FindNode("nextCancelBtn")

    m.video = m.top.FindNode("video")
    m.video.ObserveField("state", "onVideoState")
    m.video.ObserveField("position", "onPosition")
    m.video.ObserveField("duration", "onVideoDuration")

    m.osdTimer = m.top.CreateChild("Timer")
    m.osdTimer.duration = 4
    m.osdTimer.repeat = false
    m.osdTimer.ObserveField("fire", "hideOsd")

    m.progressTimer = m.top.CreateChild("Timer")
    m.progressTimer.duration = 30
    m.progressTimer.repeat = true
    m.progressTimer.ObserveField("fire", "onProgressSave")

    m.bufferTimer = m.top.CreateChild("Timer")
    m.bufferTimer.duration = 18
    m.bufferTimer.repeat = false
    m.bufferTimer.ObserveField("fire", "onBufferTimeout")

    m.nextTimer = m.top.CreateChild("Timer")
    m.nextTimer.duration = 1
    m.nextTimer.repeat = true
    m.nextTimer.ObserveField("fire", "onNextTick")

    m.osdVisible = false
    m.isLive = false
    m.didPlay = false
    m.didResume = false
    m.totalDuration = 0.0
    m.retryCount = 0
    m.nextCountdown = 0
    m.nextFocus = 0
    m.nextVisible = false

    m.top.ObserveField("streamUrl", "onUrlSet")
end sub

sub onUrlSet()
    url = m.top.streamUrl
    if url = "" then return

    hideNextOverlay()
    m.didResume = false
    m.retryCount = 0
    m.totalDuration = 0.0

    m.osdTitle.text = CleanText(m.top.contentTitle)
    m.isLive = (instr(url, "/live/") > 0)
    m.liveLabel.visible = m.isLive
    m.progressBar.visible = not m.isLive

    startPlayback(url)
    m.video.SetFocus(true)
end sub

sub startPlayback(url as String)
    m.didPlay = false
    content = CreateObject("roSGNode", "ContentNode")
    content.url = url
    content.title = m.top.contentTitle
    content.streamFormat = detectFormat(url)

    m.video.control = "stop"
    m.video.content = content
    m.video.control = "play"
end sub

function detectFormat(url as String) as String
    lower = lcase(url)
    if instr(lower, ".m3u8") > 0 then return "hls"
    if instr(lower, ".mpd") > 0 then return "dash"
    if instr(lower, ".mkv") > 0 then return "mkv"
    if instr(lower, ".mp4") > 0 then return "mp4"
    if instr(lower, ".mov") > 0 then return "mp4"
    if instr(lower, ".ts") > 0 then return "ts"
    if instr(lower, "/live/") > 0 then return "ts"
    return "mp4"
end function

sub onVideoState()
    videoState = m.video.state
    print "PLAYER state="; videoState
    if videoState = "playing"
        m.didPlay = true
        m.retryCount = 0
        m.bufferTimer.control = "stop"
        m.spinner.visible = false
        m.errorLabel.visible = false
        m.progressTimer.control = "start"
        if not m.didResume
            m.didResume = true
            if not m.isLive
                savedPos = progressLoad()
                if savedPos > 30
                    m.video.seek = savedPos
                end if
            end if
        end if
    else if videoState = "buffering"
        m.spinner.visible = true
        m.bufferTimer.control = "stop"
        m.bufferTimer.control = "start"
    else if videoState = "error"
        m.spinner.visible = false
        m.progressTimer.control = "stop"
        m.bufferTimer.control = "stop"
        print "PLAYER errorCode="; m.video.errorCode; " errorMsg="; m.video.errorMsg
        if m.isLive and m.retryCount < 3
            m.retryCount = m.retryCount + 1
            startPlayback(m.top.streamUrl)
            return
        end if
        m.errorLabel.text = "No se pudo reproducir este contenido."
        m.errorLabel.visible = true
    else if videoState = "finished"
        m.progressTimer.control = "stop"
        m.bufferTimer.control = "stop"
        if m.isLive and m.didPlay
            startPlayback(m.top.streamUrl)
            return
        end if
        if m.didPlay
            progressClear()
            markCompleted()
            RunSync(m.top)
            if hasNextEpisode()
                showNextOverlay()
                return
            end if
            m.top.navigate = {screen: "back", params: {}}
        end if
    end if
end sub

function hasNextEpisode() as Boolean
    queue = m.top.episodeQueue
    idx = m.top.episodeIndex
    if queue = invalid or idx < 0 then return false
    return idx + 1 < queue.Count()
end function

sub showNextOverlay()
    queue = m.top.episodeQueue
    nextEp = queue[m.top.episodeIndex + 1]
    m.nextTitle.text = CleanText(SafeStr(nextEp["title"]))
    m.nextCountdown = 10
    m.nextFocus = 0
    updateNextOverlay()
    m.nextOverlay.visible = true
    m.nextVisible = true
    hideOsd()
    m.nextTimer.control = "start"
    m.top.SetFocus(true)
end sub

sub updateNextOverlay()
    m.nextCountdownLabel.text = "Se reproducirá en " + m.nextCountdown.ToStr() + " s"
    m.nextPlayBtn.blendColor = iif(m.nextFocus = 0, "0xD4AA7DFF", "0x323230FF")
    m.nextCancelBtn.blendColor = iif(m.nextFocus = 1, "0xD4AA7DFF", "0x323230FF")
    playLabel = m.nextPlayBtn.GetChild(0)
    if playLabel <> invalid then playLabel.color = iif(m.nextFocus = 0, "0x272727FF", "0xF3EEE6FF")
    cancelLabel = m.nextCancelBtn.GetChild(0)
    if cancelLabel <> invalid then cancelLabel.color = iif(m.nextFocus = 1, "0x272727FF", "0xF3EEE6FF")
end sub

sub onNextTick()
    if not m.nextVisible then return
    m.nextCountdown = m.nextCountdown - 1
    if m.nextCountdown <= 0
        playNextEpisode()
        return
    end if
    updateNextOverlay()
end sub

sub hideNextOverlay()
    m.nextTimer.control = "stop"
    m.nextOverlay.visible = false
    m.nextVisible = false
end sub

sub playNextEpisode()
    hideNextOverlay()
    if not hasNextEpisode() then return
    progressClear()
    markCompleted()
    RunSync(m.top)
    nextIdx = m.top.episodeIndex + 1
    nextEp = m.top.episodeQueue[nextIdx]
    m.top.episodeIndex = nextIdx
    m.top.contentTitle = SafeStr(nextEp["title"])
    m.top.mediaId = SafeStr(nextEp["seriesId"])
    m.top.season = nextEp["season"]
    m.top.episodeNum = nextEp["episodeNum"]
    m.top.streamUrl = SafeStr(nextEp["url"])
end sub

sub onBufferTimeout()
    if m.video.state = "playing" then return
    if m.isLive and m.retryCount < 3
        m.retryCount = m.retryCount + 1
        print "PLAYER buffer timeout, retry "; m.retryCount
        startPlayback(m.top.streamUrl)
        return
    end if
    if not m.didPlay
        m.spinner.visible = false
        m.errorLabel.text = "No se pudo cargar el canal. Intenta de nuevo."
        m.errorLabel.visible = true
    end if
end sub

sub onProgressSave()
    if m.isLive then return
    if m.video.state <> "playing" then return
    progressSave()
end sub

sub progressSave()
    if m.isLive then return
    key = progressKey()
    if key = "" then return
    posVal = m.video.position
    if posVal < 30 then return
    sec = CreateObject("roRegistrySection", "progress")
    sec.Write(ProgressPositionKey(GetActiveProfileId(), key), Str(posVal))
    sec.Flush()
    SaveContinueEntry({
        key: key,
        title: m.top.contentTitle,
        url: m.top.streamUrl,
        icon: m.top.posterUrl,
        mediaKind: m.top.mediaKind,
        mediaId: m.top.mediaId,
        season: m.top.season,
        episodeNum: m.top.episodeNum,
        durationSecs: int(m.totalDuration),
        updatedAt: NowEpochMs(),
        completado: false
    })
end sub

function progressLoad() as Float
    key = progressKey()
    if key = "" then return 0.0
    sec = CreateObject("roRegistrySection", "progress")
    stored = sec.Read(ProgressPositionKey(GetActiveProfileId(), key))
    if stored = "" then return 0.0
    return Val(stored)
end function

sub progressClear()
    key = progressKey()
    if key = "" then return
    sec = CreateObject("roRegistrySection", "progress")
    sec.Delete(ProgressPositionKey(GetActiveProfileId(), key))
    sec.Flush()
end sub

' Marca como visto sin depender de la posición (fin natural del video o salto
' al siguiente episodio). Se mantiene en "continuar" (no se borra) para que
' HomeScreen lo filtre de la lista Y para que el push de sync reporte
' completado:true a otros dispositivos.
sub markCompleted()
    if m.isLive then return
    key = progressKey()
    if key = "" then return
    SaveContinueEntry({
        key: key,
        title: m.top.contentTitle,
        url: m.top.streamUrl,
        icon: m.top.posterUrl,
        mediaKind: m.top.mediaKind,
        mediaId: m.top.mediaId,
        season: m.top.season,
        episodeNum: m.top.episodeNum,
        durationSecs: int(m.totalDuration),
        updatedAt: NowEpochMs(),
        completado: true
    })
end sub

function progressKey() as String
    kind = m.top.mediaKind
    id = m.top.mediaId
    if kind <> "" and id <> ""
        if kind = "series"
            return "series:" + id + ":" + m.top.season.ToStr() + ":" + m.top.episodeNum.ToStr()
        end if
        return kind + ":" + id
    end if
    ' Fallback legacy (contenido reproducido antes de tener mediaKind/mediaId):
    ' se mantiene por título para no romper el resume de entradas ya guardadas,
    ' pero no participa en el sync (canonicalKey inválido para el backend).
    title = lcase(m.top.contentTitle)
    if title = "" then return ""
    validChars = "abcdefghijklmnopqrstuvwxyz0123456789"
    k = ""
    for i = 1 to len(title)
        c = mid(title, i, 1)
        if instr(validChars, c) > 0
            k = k + c
        end if
        if len(k) = 40 then exit for
    end for
    return k
end function

sub onPosition()
    if m.isLive then return
    curPos = m.video.position
    if m.totalDuration > 0.0
        m.osdTime.text = secsToStr(int(curPos)) + " / " + secsToStr(int(m.totalDuration))
        frac = curPos / m.totalDuration
        if frac > 1.0 then frac = 1.0
        m.progressBar.width = int(1180 * frac)
    else
        m.osdTime.text = secsToStr(int(curPos))
    end if
end sub

sub onVideoDuration()
    m.totalDuration = m.video.duration
end sub

sub showOsd()
    m.osd.visible = true
    m.osdVisible = true
    m.osdTimer.control = "start"
end sub

sub hideOsd()
    m.osd.visible = false
    m.osdVisible = false
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if m.nextVisible
        if key = "left"
            m.nextFocus = 0
            updateNextOverlay()
            return true
        end if
        if key = "right"
            m.nextFocus = 1
            updateNextOverlay()
            return true
        end if
        if key = "OK"
            if m.nextFocus = 0
                playNextEpisode()
            else
                hideNextOverlay()
                m.top.navigate = {screen: "back", params: {}}
            end if
            return true
        end if
        if key = "back"
            hideNextOverlay()
            m.top.navigate = {screen: "back", params: {}}
            return true
        end if
        return true
    end if

    if key = "back"
        if not m.isLive and m.didPlay
            progressSave()
            RunSync(m.top)
        end if
        m.progressTimer.control = "stop"
        m.bufferTimer.control = "stop"
        m.video.control = "stop"
        m.top.navigate = {screen: "back", params: {}}
        return true
    end if

    if key = "OK" or key = "play"
        togglePlayPause()
        return true
    end if

    if lcase(key) = "fastforward" or key = "right"
        if not m.isLive
            performSeek(m.video.position + 30)
        end if
        return true
    end if

    if lcase(key) = "rewind" or key = "left"
        if not m.isLive
            newPos = m.video.position - 10
            if newPos < 0 then newPos = 0
            performSeek(newPos)
        end if
        return true
    end if

    if key = "up" or key = "down"
        showOsd()
        return true
    end if

    return false
end function

sub performSeek(target as Float)
    if target < 0 then target = 0
    wasPlaying = (m.video.state = "playing")
    if wasPlaying then m.video.control = "pause"
    m.video.seek = target
    if wasPlaying then m.video.control = "resume"
    showOsd()
end sub

sub togglePlayPause()
    if m.isLive
        showOsd()
        return
    end if
    if m.video.state = "playing"
        m.video.control = "pause"
        m.osd.visible = true
        m.osdVisible = true
        m.osdTimer.control = "stop"
    else
        m.video.control = "resume"
        showOsd()
    end if
end sub

function secsToStr(secs as Integer) as String
    h = int(secs / 3600)
    mins = int((secs mod 3600) / 60)
    s = secs mod 60
    mm = right("0" + mins.ToStr(), 2)
    ss = right("0" + s.ToStr(), 2)
    if h > 0
        return h.ToStr() + ":" + mm + ":" + ss
    end if
    return mins.ToStr() + ":" + ss
end function
