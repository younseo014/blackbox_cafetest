import test from "node:test";
import assert from "node:assert/strict";
import {
  representativeTwoViewFrames,
  selectExternalCameraSlots,
  synchronizeTwoViewFrames,
  type CameraDeviceIdentity,
} from "../app/multi-camera";

const cameras: CameraDeviceIdentity[] = [
  { deviceId: "front", groupId: "front", label: "USB Camera Front" },
  { deviceId: "side", groupId: "side", label: "USB Camera Side" },
  { deviceId: "spare", groupId: "spare", label: "USB Camera Spare" },
];

test("owner capture selects exactly two cameras and keeps saved order", () => {
  const selected = selectExternalCameraSlots(cameras, [cameras[1], cameras[0]], [], 2);
  assert.deepEqual(selected.map((camera) => camera.deviceId), ["side", "front"]);
});

test("two synchronized skeleton streams produce one fixed coordinate space", () => {
  const frame = (timeMs: number, seen: number, marker: number, hand = 0) => {
    const values = Array(224).fill(0);
    values[0] = timeMs;
    values[1] = seen;
    values[2] = hand;
    values[10] = marker;
    return values;
  };
  const samples = synchronizeTwoViewFrames([
    { cameraSlot: 1, frames: [frame(0, 1, 11), frame(100, 1, 12), frame(200, 1, 13)] },
    { cameraSlot: 2, frames: [frame(0, 1, 21, 1), frame(100, 1, 22, 1), frame(200, 1, 23, 1)] },
  ]);
  assert.equal(samples.length, 3);
  assert.deepEqual(samples.map((sample) => sample.skewMs), [0, 0, 0]);
  assert.deepEqual(representativeTwoViewFrames(samples).map((frame) => frame[10]), [21, 22, 23]);
  assert.deepEqual(representativeTwoViewFrames(samples).map((frame) => frame[0]), [0, 100, 200]);
});

test("missing second skeleton does not count as a synchronized two-camera sample", () => {
  const samples = synchronizeTwoViewFrames([
    { cameraSlot: 1, frames: [[0, 1], [100, 1]] },
    { cameraSlot: 2, frames: [[0, 0], [100, 0]] },
  ]);
  assert.equal(samples.length, 0);
});
