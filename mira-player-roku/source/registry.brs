function SaveCredentials(server as String, username as String, password as String) as Void
    sec = CreateObject("roRegistrySection", "credentials")
    sec.Write("server", server)
    sec.Write("username", username)
    sec.Write("password", password)
    sec.Flush()
end function

function LoadCredentials() as Dynamic
    sec = CreateObject("roRegistrySection", "credentials")
    server = sec.Read("server")
    username = sec.Read("username")
    password = sec.Read("password")
    if server = "" or username = "" or password = "" then return invalid
    return {server: server, username: username, password: password}
end function

function ClearCredentials() as Void
    reg = CreateObject("roRegistry")
    reg.DeleteSection("credentials")
    reg.DeleteSection("favorites")
    reg.DeleteSection("progress")
    reg.Flush()
end function

function LoadFavorites() as Object
    sec = CreateObject("roRegistrySection", "favorites")
    json = sec.Read("items")
    if json <> ""
        parsed = ParseJSON(json)
        if parsed <> invalid then return parsed
    end if
    ' Migrate old format (array of ID strings)
    json = sec.Read("ids")
    if json = "" then return []
    oldIds = ParseJSON(json)
    if oldIds = invalid then return []
    result = []
    for each id in oldIds
        result.Push({id: SafeStr(id), type: "movie", name: "", icon: "", stream_id: SafeStr(id), series_id: "", container_extension: ""})
    end for
    return result
end function

function SaveFavorites(items as Object) as Void
    sec = CreateObject("roRegistrySection", "favorites")
    sec.Write("items", FormatJSON(items))
    sec.Flush()
end function

function IsFavorite(id as String) as Boolean
    favs = LoadFavorites()
    for each fav in favs
        favId = iif(type(fav) = "roAssociativeArray", SafeStr(fav["id"]), SafeStr(fav))
        if favId = id then return true
    end for
    return false
end function

function ToggleFavorite(id as String, contentType as String, item as Object) as Boolean
    favs = LoadFavorites()
    newFavs = []
    found = false
    for each fav in favs
        favId = iif(type(fav) = "roAssociativeArray", SafeStr(fav["id"]), SafeStr(fav))
        if favId = id
            found = true
        else
            newFavs.Push(fav)
        end if
    end for
    if not found
        icon = SafeStr(item["stream_icon"])
        if icon = "" then icon = SafeStr(item["cover"])
        newFavs.Push({
            id: id,
            type: contentType,
            name: SafeStr(item["name"]),
            icon: icon,
            stream_id: SafeStr(item["stream_id"]),
            series_id: SafeStr(item["series_id"]),
            container_extension: SafeStr(item["container_extension"])
        })
    end if
    SaveFavorites(newFavs)
    return not found
end function
