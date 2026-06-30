sub init()
    m.spinner = m.top.FindNode("spinner")
    m.errorLabel = m.top.FindNode("errorLabel")
    m.osd = m.top.FindNode("osd")
    m.osdTitle = m.top.FindNode("osdTitle")
    m.osdTime = m.top.FindNode("osdTime")
    m.liveLabel = m.top.FindNode("liveLabel")
    m.progressBar = m.top.FindNode("progressBar")

    m.video = m.top.CreateChild("Video")
    m.video.width = 1280
    m.video.height = 720
    m.video.translation = [0, 0]
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

    m.osdVisible = false
    m.isLive = false
    m.didPlay = false
    m.didResume = false
    m.totalDuration = 0.0
    m.retryCount = 0

    m.top.ObserveField("streamUrl", "onUrlSet")
end sub

sub onUrlSet()
    url = m.top.streamUrl
    if url = "" then return

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
            m.top.navigate = {screen: "back", params: {}}
        end if
    end if
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
    sec.Write(key, Str(posVal))
    sec.Flush()
end sub

function progressLoad() as Float
    key = progressKey()
    if key = "" then return 0.0
    sec = CreateObject("roRegistrySection", "progress")
    stored = sec.Read(key)
    if stored = "" then return 0.0
    return Val(stored)
end function

sub progressClear()
    key = progressKey()
    if key = "" then return
    sec = CreateObject("roRegistrySection", "progress")
    sec.Delete(key)
    sec.Flush()
end sub

function progressKey() as String
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
    if m.totalDuration = 0.0 then return
    curPos = m.video.position
    m.osdTime.text = secsToStr(int(curPos)) + " / " + secsToStr(int(m.totalDuration))
    frac = curPos / m.totalDuration
    if frac > 1.0 then frac = 1.0
    m.progressBar.width = int(1280 * frac)
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

    if key = "back"
        if not m.isLive and m.didPlay
            progressSave()
        end if
        m.progressTimer.control = "stop"
        m.bufferTimer.control = "stop"
        m.video.control = "stop"
        m.top.navigate = {screen: "back", params: {}}
        return true
    end if

    if key = "OK"
        if m.osdVisible
            if m.video.state = "playing"
                m.video.control = "pause"
            else
                m.video.control = "play"
            end if
        else
            showOsd()
        end if
        return true
    end if

    if key = "play"
        showOsd()
        return true
    end if

    if key = "fastForward"
        if not m.isLive
            m.video.seek = m.video.position + 30
            showOsd()
        end if
        return true
    end if

    if key = "rewind"
        if not m.isLive
            newPos = m.video.position - 10
            if newPos < 0 then newPos = 0
            m.video.seek = newPos
            showOsd()
        end if
        return true
    end if

    if key = "up"
        showOsd()
        return true
    end if

    if key = "down"
        showOsd()
        return true
    end if

    return false
end function

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
