const video = document.getElementById('video');

var socket = io.connect('http://127.0.0.1:5000');
socket.on( 'connect', function() {
  console.log("SOCKET CONNECTED")
})

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
Promise.all([
  faceapi.nets.faceLandmark68Net.loadFromUri('./static/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('./static/models'),
  faceapi.nets.ssdMobilenetv1.load('./static/models')
])
  .then(startVideo)
  .catch(err => {
    console.error(err)
    throw "Error happened"
  });

function startVideo() {
  console.log("Load model finished");
  navigator.getUserMedia(
    {
      video: {}
    },
    stream => video.srcObject = stream,
    err => console.error(err)
  )
}

video.addEventListener('play', async() => {
  const labeledFaceDescriptors = await loadLabeledImages()
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6)
  const canvas = faceapi.createCanvasFromMedia(video);
  console.log("Ready to recognize...");
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  setInterval(async () => {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const results = resizedDetections.map((d) => faceMatcher.findBestMatch(d.descriptor));
    results.forEach(async (result, i) => {
        let box = resizedDetections[i].detection.box;
        if (result["_label"] === "unknown") {
            let drawBox = new faceapi.draw.DrawBox(box, { label: result.toString(), boxColor: "red" });
            drawBox.draw(canvas); 
        } else {
            let drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
            drawBox.draw(canvas);
        }
    });
  }, 100)
})

let loadLabeledImages = async () => {
    try {
      const descriptions = [];
      console.log(`Train images`);
      const img = await faceapi.fetchImage("./static/sample/1.jpg");
      const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      descriptions.push(detections.descriptor);
      console.log(`Training finish, next`);
      return new faceapi.LabeledFaceDescriptors("Fahmi", descriptions);
    } catch (error) {
        console.error(error);
    }
};