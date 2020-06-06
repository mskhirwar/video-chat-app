'use strict'

let socket

const enableAndDisableButtons = (connected) => {
  document.getElementById('start').disabled = connected
  document.getElementById('say-hello').disabled = !connected
  document.getElementById('close').disabled = !connected
}

const addMessageToConsole = (message) => {
  const messageDiv = document.createElement('div')
  messageDiv.textContent = message
  document.getElementById('console').appendChild(messageDiv)
}

const setupWebSocketConnection = () => {
  // eslint-disable-next-line no-undef
  socket = io.connect('/')

  socket.on('connect', () => {
    const message = 'You are now connected!'
    console.log(message)
    addMessageToConsole(message)
    enableAndDisableButtons(true)
  })

  socket.on('message', (data) => {
    addMessageToConsole(`Client ${data.client} says: ${data.text}`)
  })
}

const closeConnection = () => {
  socket.disconnect()
  const message = 'You are disconnected!'
  console.log(message)
  addMessageToConsole(message)
  enableAndDisableButtons(false)
}

document.addEventListener('click', async (event) => {
  if (event.target.id === 'startVideoBtn') {
    const stream = await window.navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })
    const video = document.getElementById('video')
    video.srcObject = stream
    video.play()
  }

  if (event.target.id === 'start') {
    setupWebSocketConnection()
  } else if (event.target.id === 'say-hello') {
    socket.emit('message', {
      client: socket.id,
      text: 'Hello!',
    })
  } else if (event.target.id === 'close') {
    closeConnection()
  }
})
