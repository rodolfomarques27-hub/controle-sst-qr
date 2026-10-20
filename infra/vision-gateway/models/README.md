# YuNet face detector model

## Artifact

- File: `face_detection_yunet_2026may.onnx`
- Purpose: face detection only.
- Source project: OpenCV Zoo.
- Source repository: `opencv/opencv_zoo`
- Source path: `models/face_detection_yunet/face_detection_yunet_2026may.onnx`
- Expected size: `229738` bytes.
- SHA256: `EBAFCE4E3C118D6554634BE5C27AB333B4C047A9A8C3FAF1D7CF93101C22F0F0`
- Model input observed by SafeScan: `input`, `float32`, shape `1x3xheightxwidth`.
- Model outputs observed by SafeScan: `cls_8/16/32`, `obj_8/16/32`, `bbox_8/16/32`, `kps_8/16/32`.

This artifact is used only as a face detector. It is not a face-recognition
or identity model.

## Preprocessing contract

SafeScan reproduces the OpenCV FaceDetectorYN input convention relevant to
this model:

- source pixels are BGR;
- source layout is HWC;
- ONNX tensor layout is NCHW;
- tensor type is float32;
- pixel values are not normalized;
- RGB channel swapping is not applied;
- the image is padded with zeros on the right and bottom so width and height
  are multiples of 32.

## Post-processing provenance

The decoder follows the OpenCV `FaceDetectorYN` implementation:

- feature strides: 8, 16 and 32;
- confidence: square root of clamped class score multiplied by clamped object score;
- bounding boxes decoded from center offsets and exponential width/height;
- five facial landmarks;
- NMS after score filtering.

SafeScan defaults:

- score threshold: 0.6;
- NMS threshold: 0.3;
- topK: 5000.

## License

The OpenCV Zoo YuNet model directory distributes the model under the MIT
License.

MIT License

Copyright (c) 2020 Shiqi Yu <shiqi.yu@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
