sub init()
    m.navItems = [
        {label: "  Inicio",     screen: "home"},
        {label: "  TV en vivo", screen: "LiveScreen"},
        {label: "  Películas",  screen: "CatalogScreen", tipo: "movie"},
        {label: "  Series",     screen: "CatalogScreen", tipo: "series"},
        {label: "  Ajustes",    screen: "SettingsScreen"},
    ]

    m.navList = m.top.FindNode("navList")
    m.continueLabel = m.top.FindNode("continueLabel")
    m.continueHint = m.top.FindNode("continueHint")
    m.continueGrid = m.top.FindNode("continueGrid")
    m.favLabel = m.top.FindNode("favLabel")
    m.favGrid = m.top.FindNode("favGrid")
    m.stateLabel = m.top.FindNode("stateLabel")
    m.spinner = m.top.FindNode("spinner")
    m.contentTitle = m.top.FindNode("contentTitle")

    m.navFocused = true
    m.navIndex = 0
    m.continueFocusedIdx = 0
    m.filteredContinue = []

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
    m.continueGrid.ObserveField("itemFocused", "onContinueFocused")
    m.continueGrid.ObserveField("itemSelected", "onContinueSelected")
    m.top.ObserveField("focusedChild", "onFocusChanged")
end sub

sub onFocusChanged()
    if not m.top.IsInFocusChain() then return
    if m.top.credentials <> invalid then loadContinueDisplay()
    if not m.navList.IsInFocusChain() and not m.continueGrid.IsInFocusChain() and not m.favGrid.IsInFocusChain()
        m.navList.SetFocus(true)
    end if
end sub

sub onCredentialsSet()
    if m.top.credentials = invalid then return
    loadContinueDisplay()
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
        loadContinueDisplay()
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

sub loadContinueDisplay()
    items = LoadContinueList()
    m.filteredContinue = items

    if items.Count() = 0
        m.continueGrid.visible = false
        m.continueLabel.visible = false
        m.continueHint.visible = false
        updateEmptyState()
        return
    end if

    content = CreateObject("roSGNode", "ContentNode")
    for each entry in items
        row = CreateObject("roSGNode", "ContentNode")
        row.title = CleanText(SafeStr(entry["title"]))
        row.HDPosterUrl = SafeStr(entry["icon"])
        content.AppendChild(row)
    end for
    m.continueGrid.content = content
    m.continueGrid.visible = true
    m.continueLabel.visible = true
    m.continueHint.visible = true
    updateEmptyState()
end sub

sub updateEmptyState()
    hasContinue = m.filteredContinue.Count() > 0
    hasFavs = m.favGrid.visible
    if not hasContinue and not hasFavs
        m.stateLabel.text = "Navega al catálogo y marca contenido como favorito."
        m.stateLabel.visible = true
    else
        m.stateLabel.visible = false
    end if
end sub

sub onContinueFocused(event as Object)
    m.continueFocusedIdx = event.GetData()
end sub

sub onContinueSelected(event as Object)
    idx = event.GetData()
    if m.filteredContinue = invalid or idx < 0 or idx >= m.filteredContinue.Count() then return
    entry = m.filteredContinue[idx]
    creds = m.top.credentials
    m.top.navigate = {
        screen: "PlayerScreen",
        params: {
            streamUrl: SafeStr(entry["url"]),
            contentTitle: SafeStr(entry["title"]),
            posterUrl: SafeStr(entry["icon"]),
            credentials: creds
        }
    }
end sub

sub confirmRemoveContinue()
    if m.filteredContinue = invalid then return
    if m.continueFocusedIdx < 0 or m.continueFocusedIdx >= m.filteredContinue.Count() then return
    entry = m.filteredContinue[m.continueFocusedIdx]

    dlg = CreateObject("roSGNode", "StandardMessageDialog")
    dlg.title = "Quitar de Continuar viendo"
    dlg.message = "Quitar " + SafeStr(entry["title"]) + " de Continuar viendo?"
    dlg.buttons = ["Cancelar", "Quitar"]
    dlg.ObserveField("buttonSelected", "onRemoveContinueConfirm")
    m.removeContinueKey = SafeStr(entry["key"])
    m.removeDlg = dlg
    m.top.GetScene().Dialog = dlg
end sub

sub onRemoveContinueConfirm()
    btn = m.removeDlg.buttonSelected
    if btn = 1 and m.removeContinueKey <> invalid
        RemoveContinueEntry(m.removeContinueKey)
        loadContinueDisplay()
    end if
    m.removeDlg = invalid
    m.removeContinueKey = invalid
end sub

sub loadFavoritesDisplay()
    favs = LoadFavorites()
    if favs.Count() = 0
        m.favGrid.visible = false
        m.favLabel.visible = false
        updateEmptyState()
        return
    end if

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
    m.favLabel.visible = true
    m.filteredFavs = favs
    m.favGrid.ObserveField("itemSelected", "onFavSelected")
    updateEmptyState()
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
    if key = "options" and m.continueGrid.IsInFocusChain()
        confirmRemoveContinue()
        return true
    end if
    return false
end function
