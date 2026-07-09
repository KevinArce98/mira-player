# Reglas de código (todo el monorepo)

Aplica a **todos** los proyectos de este repo: `mira-player-web`, `mira-player-mobile`,
`mira-player-tizen`, `mira-player-roku`, `mira-sync-server`.

## No escribir comentarios en el código

No agregar comentarios de ningún tipo: ni bloques explicativos, ni comentarios de una
línea justificando el "por qué", ni JSDoc, ni `//`, ni `/* */`, ni JSX `{/* */}`, ni
BrighterScript `'`. Esto aplica también a comentarios agregados junto con un fix o
bugfix explicando la causa del bug o la razón del cambio — esa explicación va en el
mensaje del commit o en la respuesta al usuario, nunca en el código.

El código debe ser autoexplicativo mediante nombres claros de variables/funciones. Si
una decisión no es obvia, se explica en la conversación con el usuario o en el mensaje
de commit, no en un comentario.

Esta regla **anula** cualquier convención por defecto de "agregar un comentario cuando
el por qué no es obvio" — en este repo, nunca.
