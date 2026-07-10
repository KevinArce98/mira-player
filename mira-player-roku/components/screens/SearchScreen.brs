sub init()
    m.posterGrid = m.top.FindNode("posterGrid")
    m.stateLabel = m.top.FindNode("stateLabel")
    m.spinner = m.top.FindNode("spinner")

    m.rawMovies = []
    m.rawSeries = []
    m.blockedVodCats = {}
    m.blockedSeriesCats = {}
    m.vodCatsDone = false
    m.moviesDone = false
    m.seriesCatsDone = false
    m.seriesDone = false
    m.moviesFinalized = false
    m.seriesFinalized = false
    m.catalogReady = false
    m.allMovies = []
    m.allSeries = []
    m.searchTerm = ""
    m.results = []
    m.searchDialog = invalid

    m.vodCatTask = CreateObject("roSGNode", "XtreamTask")
    m.vodCatTask.ObserveField("response", "onVodCatsResponse")
    m.seriesCatTask = CreateObject("roSGNode", "XtreamTask")
    m.seriesCatTask.ObserveField("response", "onSeriesCatsResponse")
    m.movieTask = CreateObject("roSGNode", "XtreamTask")
    m.movieTask.ObserveField("response", "onMoviesResponse")
    m.seriesTask = CreateObject("roSGNode", "XtreamTask")
    m.seriesTask.ObserveField("response", "onSeriesResponse")

    m.posterGrid.ObserveField("itemSelected", "onItemSelected")
end sub

sub onCredentialsSet()
    if m.top.credentials = invalid then return
    m.vodCatTask.credentials = m.top.credentials
    m.seriesCatTask.credentials = m.top.credentials
    m.movieTask.credentials = m.top.credentials
    m.seriesTask.credentials = m.top.credentials

    m.vodCatTask.request = {action: "get_vod_categories"}
    m.seriesCatTask.request = {action: "get_series_categories"}
    m.movieTask.request = {action: "get_vod_streams"}
    m.seriesTask.request = {action: "get_series"}

    m.stateLabel.text = "Cargando catálogo…"
    m.stateLabel.visible = true
    m.spinner.visible = true

    showSearchDialog()
end sub

function getScene() as Object
    node = m.top.getParent()
    while node <> invalid
        if node.isSubtype("Scene") then return node
        node = node.getParent()
    end while
    return invalid
end function

sub showSearchDialog()
    scene = getScene()
    if scene = invalid then return
    dialog = CreateObject("roSGNode", "StandardKeyboardDialog")
    dialog.title = "Buscar"
    dialog.buttons = ["Buscar", "Cancelar"]
    if m.searchTerm <> ""
        dialog.textEditBox.text = m.searchTerm
    end if
    scene.dialog = dialog
    dialog.ObserveField("buttonSelected", "onSearchDialogButton")
    m.searchDialog = dialog
end sub

sub onSearchDialogButton()
    dialog = m.searchDialog
    if dialog = invalid then return
    btnIdx = dialog.buttonSelected
    term = dialog.textEditBox.text
    scene = getScene()
    if scene <> invalid then scene.dialog = invalid
    m.searchDialog = invalid

    if btnIdx = 0 and term <> ""
        m.searchTerm = term
        runSearch()
    else if m.searchTerm = ""
        m.top.navigate = {screen: "back", params: {}}
    end if
end sub

function buildBlockedSet(categories as Object) as Object
    blocked = {}
    for each cat in categories
        if BlockedByParental(SafeStr(cat["category_name"]))
            blocked[SafeStr(cat["category_id"])] = true
        end if
    end for
    return blocked
end function

function buildSearchable(items as Object, kind as String, blockedCats as Object) as Object
    out = []
    for each item in items
        catId = SafeStr(item["category_id"])
        if not blockedCats.DoesExist(catId)
            out.Push({
                name: SafeStr(item["name"]),
                searchNorm: NormalizeSearchText(SafeStr(item["name"])),
                searchKind: kind,
                data: item
            })
        end if
    end for
    return out
end function

sub onVodCatsResponse()
    response = m.vodCatTask.response
    if response.success then m.blockedVodCats = buildBlockedSet(response.data)
    m.vodCatsDone = true
    tryFinalizeMovies()
end sub

sub onMoviesResponse()
    response = m.movieTask.response
    if response.success then m.rawMovies = response.data
    m.moviesDone = true
    tryFinalizeMovies()
end sub

sub tryFinalizeMovies()
    if not m.vodCatsDone or not m.moviesDone then return
    m.allMovies = buildSearchable(m.rawMovies, "movie", m.blockedVodCats)
    m.moviesFinalized = true
    checkCatalogReady()
end sub

sub onSeriesCatsResponse()
    response = m.seriesCatTask.response
    if response.success then m.blockedSeriesCats = buildBlockedSet(response.data)
    m.seriesCatsDone = true
    tryFinalizeSeries()
end sub

sub onSeriesResponse()
    response = m.seriesTask.response
    if response.success then m.rawSeries = response.data
    m.seriesDone = true
    tryFinalizeSeries()
end sub

sub tryFinalizeSeries()
    if not m.seriesCatsDone or not m.seriesDone then return
    m.allSeries = buildSearchable(m.rawSeries, "series", m.blockedSeriesCats)
    m.seriesFinalized = true
    checkCatalogReady()
end sub

sub checkCatalogReady()
    if not m.moviesFinalized or not m.seriesFinalized then return
    m.catalogReady = true
    m.spinner.visible = false
    if m.searchTerm <> "" then runSearch()
end sub

sub runSearch()
    if not m.catalogReady
        m.stateLabel.text = "Cargando catálogo…"
        m.stateLabel.visible = true
        m.spinner.visible = true
        return
    end if

    m.spinner.visible = false
    term = NormalizeSearchText(m.searchTerm)
    matches = []
    for each entry in m.allMovies
        if instr(entry.searchNorm, term) > 0 then matches.Push(entry)
    end for
    for each entry in m.allSeries
        if instr(entry.searchNorm, term) > 0 then matches.Push(entry)
    end for
    m.results = matches

    content = CreateObject("roSGNode", "ContentNode")
    for each entry in matches
        row = CreateObject("roSGNode", "ContentNode")
        row.title = CleanText(entry.name)
        icon = SafeStr(entry.data["stream_icon"])
        if icon = "" then icon = SafeStr(entry.data["cover"])
        row.HDPosterUrl = icon
        content.AppendChild(row)
    end for
    m.posterGrid.content = content
    m.posterGrid.SetFocus(true)

    if matches.Count() = 0
        m.stateLabel.text = "Sin resultados para '" + m.searchTerm + "'."
        m.stateLabel.visible = true
    else
        m.stateLabel.visible = false
    end if
end sub

sub onItemSelected(event as Object)
    idx = event.GetData()
    if idx < 0 or idx >= m.results.Count() then return
    entry = m.results[idx]
    creds = m.top.credentials
    m.top.navigate = {
        screen: "DetailScreen",
        params: {credentials: creds, contentData: entry.data, contentType: entry.searchKind}
    }
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    if key = "back"
        m.top.navigate = {screen: "back", params: {}}
        return true
    end if

    if key = "search" or key = "green"
        showSearchDialog()
        return true
    end if

    return false
end function
