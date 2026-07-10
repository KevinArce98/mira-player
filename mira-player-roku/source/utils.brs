function BuildApiUrl(server as String, username as String, password as String, params as Object) as String
    url = server + "/player_api.php?username=" + username + "&password=" + password
    for each key in params
        url = url + "&" + key + "=" + params[key]
    end for
    return url
end function

function LiveStreamUrl(server as String, username as String, password as String, streamId as String) as String
    return server + "/live/" + username + "/" + password + "/" + streamId + ".ts"
end function

function MovieStreamUrl(server as String, username as String, password as String, streamId as String, ext as String) as String
    if ext = "" then ext = "mp4"
    return server + "/movie/" + username + "/" + password + "/" + streamId + "." + ext
end function

function SeriesStreamUrl(server as String, username as String, password as String, episodeId as String, ext as String) as String
    if ext = "" then ext = "mp4"
    return server + "/series/" + username + "/" + password + "/" + episodeId + "." + ext
end function

function SafeStr(val as Dynamic) as String
    if val = invalid then return ""
    if type(val) = "String" then return val
    return val.ToStr()
end function

function SafeInt(val as Dynamic) as Integer
    if val = invalid then return 0
    if type(val) = "Integer" or type(val) = "roInt" then return val
    if type(val) = "String" then return val.ToInt()
    return int(val)
end function

function TruncateStr(s as String, maxLen as Integer) as String
    if len(s) <= maxLen then return s
    return left(s, maxLen) + "…"
end function

function iif(condition as Boolean, trueVal as Dynamic, falseVal as Dynamic) as Dynamic
    if condition then return trueVal
    return falseVal
end function

function NormalizeSearchText(s as String) as String
    return lcase(StripDiacritics(s))
end function

function CleanText(s as String) as String
    if s = "" then return ""
    src = CreateObject("roByteArray")
    src.FromAsciiString(s)
    out = CreateObject("roByteArray")
    i = 0
    n = src.Count()
    while i < n
        b = src[i]
        if b < 128
            out.Push(b)
            i = i + 1
        else if b >= 192 and b < 224
            out.Push(b)
            if i + 1 < n then out.Push(src[i + 1])
            i = i + 2
        else if b >= 224 and b < 240
            i = i + 3
        else if b >= 240
            i = i + 4
        else
            i = i + 1
        end if
    end while
    result = out.ToAsciiString()
    return result.Trim()
end function
