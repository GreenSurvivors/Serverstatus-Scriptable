// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: leaf;

/**
 * GreenSurvivors Serverstatus Widget
 * v1.1
 * Copyright GreenSurvivors.de 2021
 */

const debug = false

const widget = new ListWidget()

// Lade externe Daten
const serverStatus = await fetchServerStatus()
var playerHeads = null
if ((config.widgetFamily == "large" || debug)) {
  playerHeads = await loadPlayerHeads(serverStatus.players)
}
const backgroundImage = await loadImageWithCache("https://greensurvivors.de/wp-content/uploads/2017/12/Wallpaper.jpg", "grsv_bg", 7)

createWidget()
if (!config.runsInWidget && debug) {
  await widget.presentLarge()
}
if (!config.runsInWidget && !debug) {
  const callback = new CallbackURL("https:greensurvivors.de")
  callback.open()
}
Script.setWidget(widget)
Script.complete()

/*****************
 * Methoden
 *****************/

 /**
  * Erzeugt das Widget
  */
async function createWidget() {  
  widget.setPadding(0, 0, 0, 0)
  widget.backgroundColor = new Color("#181818")
  widget.backgroundImage = backgroundImage
  
  const backgroundWrapper = widget.addStack()
  backgroundWrapper.backgroundColor = new Color("000000", 0.6)
  backgroundWrapper.setPadding(10, 20, 10, 20)
  backgroundWrapper.layoutVertically()
  
  const titleFontSize = 26
  const mediumFontSize = 18
  
  const mainWrapper = backgroundWrapper.addStack()
  // Expand für Hintergrund
  backgroundWrapper.addSpacer()
  // Content nach oben schieben
  
  mainWrapper.layoutVertically()
  
  const serverStatusStack = mainWrapper.addStack()
  serverStatusStack.setPadding(8, 0, 8, 0)
  
  // Icon
  try {
    const faviconBase64 = serverStatus.favicon.split("base64,")[1]
 	  const faviconData = Data.fromBase64String(faviconBase64)
  	const faviconImage = Image.fromData(faviconData)
  	const favicon = serverStatusStack.addImage(faviconImage)
  	favicon.imageSize = new Size(64, 64)  
  } catch(e) {
	  console.error(e.message)  
  }
  
  serverStatusStack.addSpacer(8)
  
  // Servername
  const statusTextStack = serverStatusStack.addStack()  
  statusTextStack.layoutVertically()
  const header = statusTextStack.addStack()
  const serverName = header.addText('GreenSurvivors.de')  
  serverName.textColor = Color.white()
  serverName.font = Font.regularSystemFont(titleFontSize)

  // Players
  const playerCount = statusTextStack.addStack()
  const players = serverStatus.info.Players
  const maxPlayers = serverStatus.info.MaxPlayers
  const playerCountText = players + '/' + maxPlayers
  const text = playerCount.addText(playerCountText)
  text.font = Font.regularSystemFont(mediumFontSize)
  text.textColor = Color.white()

  if (config.widgetFamily == "large" || debug) {
    await createPlayerList(mainWrapper)
  }
}

/**
 * Lädt den Serverstatus vom Webservice
 */
async function fetchServerStatus() {
  let url = "https://greensurvivors.de/forum/webservice/minecraft/serverQuery?url=greensurvivors.de&port=25565"
  const request = new Request(url)
  let res = await request.loadString()
  let obj = JSON.parse(res)
  
  if (obj.players == false) {
    obj.players = []
  }
  
  return obj
}

/**
 * Lädt die Spielerköpfe
 * @param players 
 */
async function loadPlayerHeads(players) {
  heads = new Map()
  for (player of players) {
    let icon = await getPlayerhead(player, 16)
    heads.set(player, icon)
  }
  return heads
}

/**
 * Erzeugt eine zweispaltige Spielerliste und hängt sie an view an
 * @param view Stack in den die Liste eingepflegt werden soll
 */
async function createPlayerList(view) {
  try {
    const playerListWrapper = view.addStack()
    playerListWrapper.layoutHorizontally()

    // left column
    const playerListLeft = playerListWrapper.addStack()
    playerListLeft.layoutVertically()
    playerListLeft.addStack().addSpacer()
    // right column
    const playerListRight = playerListWrapper.addStack()
    playerListRight.layoutVertically()
    playerListRight.addStack().addSpacer()

	  let lic = 0 // List Item Count
    for ([player, icon] of playerHeads) {
      if (lic >= 18) {
        let more = view.addText("... und " + (playerHeads.size - lic) + " weitere Spieler")
        more.font = Font.regularSystemFont(12)
        more.textColor = Color.white()
        break
      }
      let playerEntry = null
      if ((lic + 1) % 2 == 0) {
        playerEntry = playerListRight.addStack()
      } else {
        playerEntry = playerListLeft.addStack()
      }
      playerEntry.setPadding(4, 0, 4, 0)
      if (icon != null) {
      	let head = playerEntry.addImage(icon)
        head.imageSize = new Size(16, 16)
      } else {
        playerEntry.addSpacer(16)
      }
      playerEntry.addSpacer(4)
      let playerName = playerEntry.addText(player)
      playerName.font = Font.regularSystemFont(12)
      playerName.textColor = Color.white()
      lic++
    }
  } catch(e) {
    console.error(e.message)
  }
}

/**
 * Spielerkopf herunterladen
 * @param player
 * @param size
 */
async function getPlayerhead(player, size) {
  try {
      let imageUrl = "https://cravatar.eu/helmavatar/" + player + "/" + size + ".png"
      let iconImage = loadImageWithCache(imageUrl, player, 7)
      return iconImage
  } catch (e) {
    console.error(e.message + " Player: " + player)
  }
}

/**
 * Lädt ein Bild aus einer URL oder Cache
 * @param url 
 * @param name 
 * @param cacheTime 
 */
async function loadImageWithCache(url, name, cacheTime) {
  try {
    let fm = FileManager.local()
    let dir = fm.joinPath(fm.documentsDirectory(), "grsv_status")
    if (!fm.fileExists(dir)) {
      fm.createDirectory(dir)
    }
    
    let path = fm.joinPath(dir, name)
    
    let cacheDate = new Date()
    cacheDate.setDate(cacheDate.getDate() - cacheTime)
    
    if (fm.fileExists(path) && fm.modificationDate(path) > cacheDate) {
      console.log(`Image found in cache ${name}`)
      return fm.readImage(path)
    } else {
      // download once
      let iconImage = await loadImage(url)
      fm.writeImage(path, iconImage)
      console.log(`Image downloaded ${name}`)
      return iconImage
    }
  } catch (e) {
    console.error(e.message + " Name: " + name)
  }
}

/**
 * Lädt ein Bild von einer URL
 * @param imgUrl 
 */
async function loadImage(imgUrl) {
  const req = new Request(imgUrl)
  return await req.loadImage()
}