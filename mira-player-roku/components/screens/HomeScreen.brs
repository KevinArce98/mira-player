sub init()
    m.navItems = [
        {label: "  Inicio",     screen: "home"},
        {label: "  TV en vivo", screen: "LiveScreen"},
        {label: "  Películas",  screen: "CatalogScreen", tipo: "movie"},
        {label: "  Series",     screen: "CatalogScreen", tipo: "series"},
        {label: "  Ajustes",    screen: "SettingsScreen"},
    ]

    m.navList = m.top.FindNode("navList")
    m.favGrid = m.top.FindNode("favGrid")
    m.stateLabel = m.top.FindNode("stateLabel")
    m.spinner = m.top.FindNode("spinner")
    m.contentTitle = m.top.FindNode("contentTitle")

    m.navFocused = true
    m.navIndex = 0

    content = CreateObject("roSGNode", "ContentNode")
    for each item in m.navItems
        row = CreateObject("roSGNode", "ContentNode")
        row.title = item.label
        content.AppendChild(row)
    end for
    m.navList.content = content
    m.navList.SetFocus(true)

    m.navList.ObserveField("itemSelected", "onNavSelected")
    m.navList.ObserveField("itemFocused", "onNavFocused")
    m.top.ObserveField("focusedChild", "onFocusChanged")
end sub

sub onFocusChanged()
    if m.top.IsInFocusChain() and not m.navList.IsInFocusChain()
        m.navList.SetFocus(true)
    end if
end sub

sub onCredentialsSet()
    if m.top.credentials = invalid then return
    loadFavoritesDisplay()
end sub

sub onNavFocused(event as Object)
    m.navIndex = event.GetData()
end sub

sub onNavSelected(event as Object)
    idx = event.GetData()
    item = m.navItems[idx]

    if item.screen = "home"
        m.contentTitle.text = "Inicio"
        loadFavoritesDisplay()
        return
    end if

    params = {credentials: m.top.credentials}
    if item.DoesExist("tipo")
        params.contentType = item.tipo
        params.sectionTitle = iif(item.tipo = "movie", "Películas", "Series")
    end if

    m.top.navigate = {screen: item.screen, params: params}
end sub

sub loadFavoritesDisplay()
    favs = LoadFavorites()
    if favs.Count() = 0
        m.favGrid.visible = false
        m.stateLabel.text = "Navega al catálogo y marca contenido como favorito."
        m.stateLabel.visible = true
        return
    end if

    m.stateLabel.visible = false
    content = CreateObject("roSGNode", "ContentNode")
    for each fav in favs
        row = CreateObject("roSGNode", "ContentNode")
        if type(fav) = "roAssociativeArray"
            row.title = CleanText(SafeStr(fav["name"]))
            row.HDPosterUrl = SafeStr(fav["icon"])
        else
            row.title = SafeStr(fav)
        end if
        content.AppendChild(row)
    end for
    m.favGrid.content = content
    m.favGrid.visible = true
    m.filteredFavs = favs
    m.favGrid.ObserveField("itemSelected", "onFavSelected")
end sub

sub onFavSelected(event as Object)
    idx = event.GetData()
    if m.filteredFavs = invalid then return
    fav = m.filteredFavs[idx]
    creds = m.top.credentials

    if type(fav) = "roAssociativeArray"
        contentType = SafeStr(fav["type"])
        contentData = {
            name: SafeStr(fav["name"]),
            stream_icon: SafeStr(fav["icon"]),
            cover: SafeStr(fav["icon"]),
            stream_id: SafeStr(fav["stream_id"]),
            series_id: SafeStr(fav["series_id"]),
            container_extension: SafeStr(fav["container_extension"])
        }
        m.top.navigate = {
            screen: "DetailScreen",
            params: {credentials: creds, contentData: contentData, contentType: contentType}
        }
    else
        streamId = SafeStr(fav)
        url = MovieStreamUrl(creds.server, creds.username, creds.password, streamId, "mp4")
        m.top.navigate = {
            screen: "PlayerScreen",
            params: {streamUrl: url, contentTitle: streamId, credentials: creds}
        }
    end if
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false
    if key = "back"
        return true
    end if
    return false
end function
