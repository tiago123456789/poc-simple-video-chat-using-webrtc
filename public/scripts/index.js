window.addEventListener('load', (event) => {
    let peerConnection;

    let localStream;
    navigator.getUserMedia({
        audio: true, video: true
    },
        (stream) => {
            const localVideo = document.querySelector("#local-video");
            if (localVideo) localVideo.srcObject = stream;
            peerConnection = new RTCPeerConnection();
            localStream = stream

            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            peerConnection.ontrack = function ({ streams: [stream] }) {
                const remoteVideo = document.getElementById("remote-video");
                if (remoteVideo) {
                    remoteVideo.srcObject = stream;
                }
            };
        },
        error => {
            console.warn(error.message);
        })

    const activeUserContainerElement = document.querySelector("#active-user-container")

    const socket = io("/", {
        allowEIO3: true
    });

    const callUser = async (socketId) => {
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(new RTCSessionDescription(offer));
        socket.emit("create-offer", {
            offer, to: socketId
        })
    }

    const renderUserList = (data) => {
        const activeUserContainerElementHTML = activeUserContainerElement.innerHTML;
        activeUserContainerElement.innerHTML = "";
        const divs = data.users.map(socketId => {
            const hasUserDivContainer = document.querySelector(`#${socketId}`)
            if (!hasUserDivContainer) {
                const divContainer = `
                    <div class="active-user" id=${socketId}>
                        <p class="username">Socket: ${socketId}</p>
                    </div>
                `;
                return divContainer
            }

        })
            .filter(item => item != null)
            .join("")

        activeUserContainerElement.innerHTML = activeUserContainerElementHTML + divs
        console.log(data)
    }

    const receiveOfferAndAnswer = async (data) => {
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(new RTCSessionDescription(answer))
        socket.emit("create-answer", { answer, to: data.to })
    }

    const receiveAnswerAfterSendOffer = async (data) => {
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );
    }

    socket.on("connect", () => {
        socket.on("update-user-list", renderUserList)
        socket.on("made-offer", receiveOfferAndAnswer)
        socket.on("made-answer", receiveAnswerAfterSendOffer)
    })

    activeUserContainerElement.addEventListener("click", (event) => {
        callUser(event.target.parentNode.id)
    })

    let microphoneMute = false;
    let disableVideo = false; 

    const micElement = document.querySelector("#microphone");
    micElement.addEventListener("click", event => {
        event.preventDefault();
        if (microphoneMute) {
            microphoneMute = false
            localStream.getAudioTracks()[0].enabled = true
            micElement.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>'
        } else {
            microphoneMute = true
            localStream.getAudioTracks()[0].enabled = false
            micElement.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>'
        }
    })

    const videoElement = document.querySelector("#video");
    videoElement.addEventListener("click", event => {
        event.preventDefault();
        if (disableVideo) {
            disableVideo = false
            localStream.getVideoTracks()[0].enabled = true
            videoElement.innerHTML = '<i class="fa-solid fa-video"></i>'
        } else {
            disableVideo = true
            localStream.getVideoTracks()[0].enabled = false
            videoElement.innerHTML = '<i class="fa-solid fa-video-slash"></i>'
        }
    })

});