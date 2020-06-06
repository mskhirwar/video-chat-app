const {RTCPeerConnection, RTCSessionDescription} = window


let isAlreadyCalling = false

const peerConnection = new RTCPeerConnection();

async function callUser(socketId) {
    console.log(`socketId: ${socketId}`)
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer))

    socket.emit('call-user', {
        offer,
        to: socketId
    })
}

function unselectUsersFromList() {
    const alreadySelectorUser = document.querySelectorAll('.active-user.active-user--selected')

    alreadySelectorUser.forEach(el => {
        el.setAttribute('class', 'active-user')
    })
}

function createUserItemContainer(socketId) {
    const userContainerEl = document.createElement('div')
    const userNameEl = document.createElement('p')

    userContainerEl.setAttribute('class', 'active-user')
    userContainerEl.setAttribute('id', socketId)
    userNameEl.setAttribute('class', 'username')
    userNameEl.innerHTML = `Socket: ${socketId}`

    userContainerEl.appendChild(userNameEl)

    userContainerEl.addEventListener('click', () => {
        unselectUsersFromList()
        userContainerEl.setAttribute('class', 'active-user active-user--selected')
        const talkingWithInfo = document.getElementById('talking-with-info')
        talkingWithInfo.innerHTML = `Talking with: 'Socket: ${socketId}'`
        callUser(socketId)
    })

    return userContainerEl
}

function updateUserList(socketIds) {
    const activeUserContainer = document.getElementById('active-user-container')

    socketIds.forEach( socketId => {
        const alreadyExistingUser = document.getElementById(socketId)

        if (!alreadyExistingUser) {
            const userContainerEl = createUserItemContainer(socketId)

            activeUserContainer.appendChild(userContainerEl)
        }
    })
}

const socket = io.connect('/')

socket.on('update-user-list', ({users}) => {
    updateUserList(users)
})

socket.on('remove-user', ({socketId}) => {
    const elToRemove = document.getElementById(socketId)

    if (elToRemove) {
        elToRemove.remove()
    }
})

socket.on('call-made', async data => {
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    )

    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer))

    socket.emit('make-answer', {
        answer,
        to: data.socket
    })
})

socket.on('answer-made', async data => {
    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
    )

    if (!isAlreadyCalling) {
        callUser(data.socket)
        isAlreadyCalling = true
    }
})

peerConnection.ontrack = function({streams: [stream]}) {
    const remoteVideo = document.getElementById('remote-video')

    if (remoteVideo) {
        remoteVideo.srcObject = stream
    }
}


navigator.mediaDevices.getUserMedia({video: true, audio: true})
    .then((stream) => {
        const localVideo = document.getElementById('local-video')
            
        if (localVideo) {
            localVideo.srcObject = stream
        }

        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))
    },
    error => {
        console.warn(error.message)
    })