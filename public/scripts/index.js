'use strict'

let code

let displayMediaStream
let userMediaStream
const senders = []

const MESSAGE_TYPE = {
  SDP: 'SDP',
  CANDIDATE: 'CANDIDATE',
}

// Selectors
const $selfView = document.getElementById('self-view')
const $shareButton = document.getElementById('share-button')
const $stopShareButton = document.getElementById('stop-share-button')
const $startChatButton = document.getElementById('start-button')

// TODO:
// These Ice servers are testing purposes only
// Need to update before pushing code to production
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
}

const showChatRoom = () => {
  document.getElementById('start').style.display = 'none'
  document.getElementById('chat-room').style.display = 'block'
}

const createAndSendOffer = async (signaling, peerConnection) => {
  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)

  sendMessage(signaling, {
    message_type: MESSAGE_TYPE.SDP,
    content: offer,
  })
}

const createPeerConnection = (signaling) => {
  const peerConnection = new RTCPeerConnection(iceServers)

  peerConnection.onnegotiationneeded = async () => {
    await createAndSendOffer(signaling, peerConnection)
  }

  peerConnection.onicecandidate = (iceEvent) => {
    if (iceEvent && iceEvent.candidate) {
      sendMessage(signaling, {
        message_type: MESSAGE_TYPE.CANDIDATE,
        content: iceEvent.candidate,
      })
    }
  }

  peerConnection.ontrack = (event) => {
    const video = document.getElementById('remote-view')

    if (!video.srcObject) {
      video.srcObject = event.streams[0]
    }
  }

  return peerConnection
}

const sendMessage = (signaling, message) => {
  if (code) {
    signaling.emit('message', {
      ...message,
      code,
    })
  }
}

const addMessageHandler = (signaling, peerConnection) => {
  signaling.on('message', async (data) => {
    if (!data) {
      return
    }

    const { message_type, content } = data

    try {
      if (message_type === MESSAGE_TYPE.CANDIDATE && content) {
        await peerConnection.addIceCandidate(content)
      } else if (message_type === MESSAGE_TYPE.SDP) {
        if (content.type === 'offer') {
          await peerConnection.setRemoteDescription(content)
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)

          sendMessage(signaling, {
            message_type: MESSAGE_TYPE.SDP,
            content: answer,
          })
        } else if (content.type === 'answer') {
          await peerConnection.setRemoteDescription(content)
        } else {
          console.log('Unsupported SDP type.')
        }
      }
    } catch (err) {
      console.error(err)
    }
  })
}

const startChat = async () => {
  try {
    userMediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    })

    showChatRoom()
    // eslint-disable-next-line no-undef
    const signaling = io.connect('/')
    const peerConnection = createPeerConnection(signaling)

    addMessageHandler(signaling, peerConnection)

    userMediaStream
      .getTracks()
      .forEach((track) =>
        senders.push(peerConnection.addTrack(track, userMediaStream))
      )
    $selfView.srcObject = userMediaStream
  } catch (err) {
    console.error(err)
  }
}

document.addEventListener('input', async (event) => {
  if (event.target.id === 'code-input') {
    const { value } = event.target

    if (value.length > 8) {
      $startChatButton.disabled = false
      code = value
    } else {
      $startChatButton.disabled = true
      code = null
    }
  }
})

document.addEventListener('click', async (event) => {
  if (event.target.id === 'start-button' && code) {
    startChat()
  }
})

$shareButton.addEventListener('click', async () => {
  if (!displayMediaStream) {
    displayMediaStream = await navigator.mediaDevices.getDisplayMedia()
  }

  senders
    .find((sender) => sender.track.kind === 'video')
    .replaceTrack(displayMediaStream.getTracks()[0])

  // show what you are showing in your "self-view" video
  $selfView.srcObject = displayMediaStream

  // hide the share button and display the "stop-sharing" button
  $shareButton.style.display = 'none'
  $stopShareButton.style.display = 'inline'
})

$stopShareButton.addEventListener('click', async () => {
  senders
    .find((sender) => sender.track.kind === 'video')
    .replaceTrack(
      userMediaStream.getTracks().find((track) => track.kind === 'video')
    )

  $selfView.srcObject = userMediaStream
  $shareButton.style.display = 'inline'
  $stopShareButton.style.display = 'none'
})
