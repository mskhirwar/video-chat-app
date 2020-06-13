'use strict'

// let signaling

const MESSAGE_TYPE = {
  SDP: 'SDP',
  CANDIDATE: 'CANDIDATE',
}

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

  signaling.emit('message', {
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
      signaling.emit('message', {
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

          signaling.emit('message', {
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
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    })

    showChatRoom()
    // eslint-disable-next-line no-undef
    const signaling = io.connect('/')
    const peerConnection = createPeerConnection(signaling)

    addMessageHandler(signaling, peerConnection)

    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream))
    document.getElementById('self-view').srcObject = stream
  } catch (err) {
    console.error(err)
  }
}

document.addEventListener('click', async (event) => {
  if (event.target.id === 'start') {
    startChat()
  }
})
