sub init()
    m.navItems = [
        {label: "Inicio",     icon: "pkg:/images/icons/nav_home.png",     screen: "home"},
        {label: "En vivo",    icon: "pkg:/images/icons/nav_live.png",     screen: "LiveScreen"},
        {label: "Películas",  icon: "pkg:/images/icons/nav_movies.png",   screen: "CatalogScreen", tipo: "movie"},
        {label: "Series",     icon: "pkg:/images/icons/nav_series.png",   screen: "CatalogScreen", tipo: "series"},
        {label: "Perfiles",   icon: "pkg:/images/icons/nav_profiles.png", screen: "ProfileScreen"},
        {label: "Ajustes",    icon: "pkg:/images/icons/nav_settings.png", screen: "SettingsScreen"},
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
        row.AddFields({iconUri: item.icon})
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
    if m.top.credentials <> invalid
        loadContinueDisplay()
        loadFavoritesDisplay()
    end if
    if not m.navList.IsInFocusChain() and not m.continueGrid.IsInFocusChain() and not m.favGrid.IsInFocusChain()
        m.navList.SetFocus(true)
    end if
end sub

sub onCredentialsSet()
    if m.top.credentials = invalid then return
    loadContinueDisplay()
    loadFavoritesDisplay()
    RunSync(m.top)
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
    activeProfile = GetActiveProfileId()
    all = LoadContinueList()
    items = []
    for each entry in all
        owned = entry["profileId"] = invalid or entry["profileId"] = activeProfile
        if entry["completado"] <> true and entry["deletedAt"] = invalid and owned then items.Push(entry)
    end for
    m.filteredContinue = items

    if items.Count() = 0
        m.continueGrid.visible = false
        m.continueLabel.visible = false
        m.continueHint.visible = false
        updateEmptyState()
        repositionFav()
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
    repositionFav()
end sub

' Favoritos ocupa el lugar de "Continuar viendo" cuando esa fila está vacía,
' para no dejar un hueco en blanco entre el título y Favoritos.
sub repositionFav()
    if m.continueGrid.visible
        m.favLabel.translation = [224, 352]
        m.favGrid.translation = [224, 382]
    else
        m.favLabel.translation = [224, 88]
        m.favGrid.translation = [224, 118]
    end if
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
    mediaKind = entry["mediaKind"]
    if mediaKind = invalid then mediaKind = ""
    mediaId = entry["mediaId"]
    if mediaId = invalid then mediaId = ""
    season = entry["season"]
    if season = invalid then season = -1
    episodeNum = entry["episodeNum"]
    if episodeNum = invalid then episodeNum = -1
    m.top.navigate = {
        screen: "PlayerScreen",
        params: {
            streamUrl: SafeStr(entry["url"]),
            contentTitle: SafeStr(entry["title"]),
            posterUrl: SafeStr(entry["icon"]),
            credentials: creds,
            mediaKind: SafeStr(mediaKind),
            mediaId: SafeStr(mediaId),
            season: season,
            episodeNum: episodeNum
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
    activeProfile = GetActiveProfileId()
    all = LoadFavorites()
    favs = []
    for each fav in all
        if type(fav) <> "roAssociativeArray"
            favs.Push(fav)
        else
            owned = fav["profileId"] = invalid or fav["profileId"] = activeProfile
            if fav["deletedAt"] = invalid and owned then favs.Push(fav)
        end if
    end for
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
    repositionFav()
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
            params: {streamUrl: url, contentTitle: streamId, credentials: creds, mediaKind: "movie", mediaId: streamId}
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

    if key = "right" and m.navList.IsInFocusChain()
        if m.continueGrid.visible
            m.continueGrid.SetFocus(true)
            return true
        else if m.favGrid.visible
            m.favGrid.SetFocus(true)
            return true
        end if
    end if

    if key = "left"
        if m.continueGrid.IsInFocusChain() or m.favGrid.IsInFocusChain()
            m.navList.SetFocus(true)
            return true
        end if
    end if

    return false
end function
