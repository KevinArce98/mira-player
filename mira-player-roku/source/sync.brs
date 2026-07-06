' URL del backend mira-sync-server. Vacío = sync desactivado (comportamiento
' actual sin cambios). Configura aquí antes de empaquetar, ej:
' "http://192.168.1.84:8787"
function SyncBaseUrl() as String
    return ""
end function

' Fire-and-forget: crea un SyncTask hijo de hostNode (normalmente m.top de la
' pantalla que llama) para mantenerlo vivo mientras dura la petición async.
' No se espera respuesta ni se remueve el nodo explícitamente; se libera solo
' cuando la pantalla que lo alojó se destruye.
sub RunSync(hostNode as Object) as Void
    if SyncBaseUrl() = "" then return
    creds = LoadCredentials()
    if creds = invalid then return

    task = CreateObject("roSGNode", "SyncTask")
    hostNode.AppendChild(task)
    task.credentials = creds
    task.control = "RUN"
end sub
