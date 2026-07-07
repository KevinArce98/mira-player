' URL del backend mira-sync-server. Vacío = sync desactivado (comportamiento
' actual sin cambios). Configura aquí antes de empaquetar, ej:
' "http://192.168.1.84:8787"
function SyncBaseUrl() as String
    return "https://mira-sync.myserverpi.xyz"
end function

' Fire-and-forget: crea un SyncTask anclado al Scene (no a hostNode
' directamente) para que sobreviva aunque la pantalla que llamó a RunSync se
' destruya de inmediato después (ej. PlayerScreen navega "back" justo tras
' llamar RunSync). El Scene vive mientras dure la app, así que la petición
' async no se cancela a mitad de camino. Se libera solo cuando la app cierra.
sub RunSync(hostNode as Object) as Void
    if SyncBaseUrl() = "" then return
    creds = LoadCredentials()
    if creds = invalid then return

    anchor = hostNode
    scene = hostNode.GetScene()
    if scene <> invalid then anchor = scene

    task = CreateObject("roSGNode", "SyncTask")
    anchor.AppendChild(task)
    task.credentials = creds
    task.control = "RUN"
end sub
