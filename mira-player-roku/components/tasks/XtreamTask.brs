sub init()
    m.top.FunctionName = "processRequest"
end sub

sub onRequest()
    m.top.Control = "RUN"
end sub

sub processRequest()
    request = m.top.request
    creds = m.top.credentials

    if request = invalid or creds = invalid
        m.top.response = {success: false, error: "Solicitud inválida"}
        return
    end if

    action = request.action

    if action = "authenticate"
        url = creds.server + "/player_api.php?username=" + creds.username + "&password=" + creds.password
    else
        params = {}
        params["action"] = action
        if request.DoesExist("category_id") and request.category_id <> ""
            params["category_id"] = request.category_id
        end if
        if request.DoesExist("series_id")
            params["series_id"] = request.series_id
        end if
        if request.DoesExist("vod_id")
            params["vod_id"] = request.vod_id
        end if
        if request.DoesExist("stream_id")
            params["stream_id"] = request.stream_id
            params["limit"] = "8"
        end if
        url = BuildApiUrl(creds.server, creds.username, creds.password, params)
    end if

    http = CreateObject("roUrlTransfer")
    http.SetUrl(url)
    http.SetCertificatesFile("common:/certs/ca-bundle.crt")
    http.InitClientCertificates()

    port = CreateObject("roMessagePort")
    http.SetMessagePort(port)

    if not http.AsyncGetToString()
        m.top.response = {success: false, error: "No se pudo conectar al servidor"}
        return
    end if

    event = wait(15000, port)
    if event = invalid
        http.AsyncCancel()
        m.top.response = {success: false, error: "Tiempo de espera agotado"}
        return
    end if

    responseStr = event.GetString()

    if responseStr = ""
        m.top.response = {success: false, error: "Sin respuesta del servidor"}
        return
    end if

    data = ParseJSON(responseStr)
    if data = invalid
        m.top.response = {success: false, error: "Respuesta inválida del servidor"}
        return
    end if

    if action = "authenticate"
        userInfo = data["user_info"]
        if userInfo = invalid
            m.top.response = {success: false, error: "Respuesta inválida del servidor"}
            return
        end if
        authVal = userInfo["auth"]
        if authVal = 1 or authVal = "1"
            m.top.response = {success: true, data: data}
        else
            m.top.response = {success: false, error: "Credenciales rechazadas por el servidor"}
        end if
        return
    end if

    m.top.response = {success: true, data: data}
end sub
