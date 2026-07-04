sub init()
    m.screenStack = []
    creds = LoadCredentials()
    if creds = invalid
        pushScreen("SetupScreen", {})
    else
        pushScreen("HomeScreen", {credentials: creds})
    end if
end sub

sub pushScreen(screenName as String, params as Object)
    screen = CreateObject("roSGNode", screenName)

    if params.DoesExist("contentType") then screen.contentType = params.contentType
    if params.DoesExist("sectionTitle") then screen.sectionTitle = params.sectionTitle
    if params.DoesExist("contentTitle") then screen.contentTitle = params.contentTitle
    if params.DoesExist("credentials") then screen.credentials = params.credentials
    if params.DoesExist("contentData") then screen.contentData = params.contentData
    if params.DoesExist("posterUrl") then screen.posterUrl = params.posterUrl
    if params.DoesExist("episodeQueue") then screen.episodeQueue = params.episodeQueue
    if params.DoesExist("episodeIndex") then screen.episodeIndex = params.episodeIndex
    if params.DoesExist("streamUrl") then screen.streamUrl = params.streamUrl

    m.top.AppendChild(screen)
    m.screenStack.Push(screen)
    screen.ObserveField("navigate", "onNavigate")
    screen.SetFocus(true)
end sub

sub popScreen()
    if m.screenStack.Count() <= 1 then return
    old = m.screenStack.Pop()
    m.top.RemoveChild(old)
    current = m.screenStack[m.screenStack.Count() - 1]
    current.SetFocus(true)
end sub

sub onNavigate(event as Object)
    data = event.GetData()
    if data = invalid then return

    if data.screen = "back"
        popScreen()
    else
        pushScreen(data.screen, data.params)
    end if
end sub
