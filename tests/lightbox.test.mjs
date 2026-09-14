import { test } from 'node:test';
import assert from 'node:assert/strict';
import { youtubeEmbedUrl } from '../lightbox.js';

test('youtubeEmbedUrl: embed nocookie con el id y flags esperados', () => {
  const url = youtubeEmbedUrl('RQfjTjdYvTQ');
  assert.ok(url.startsWith('https://www.youtube-nocookie.com/embed/RQfjTjdYvTQ?'), url);
  assert.match(url, /autoplay=1/);
  assert.match(url, /rel=0/);
  assert.match(url, /modestbranding=1/);
});

test('youtubeEmbedUrl: autoplay:false apaga el autoplay', () => {
  assert.match(youtubeEmbedUrl('abc', { autoplay: false }), /autoplay=0/);
});
