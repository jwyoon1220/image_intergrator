import { PhotonImage, watermark } from "@cf-wasm/photon";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ?img=url1&img=url2&img=url3 형식으로 받기
    const imgUrls = url.searchParams.getAll('img');

    if (imgUrls.length < 2) {
      return new Response('img=URL1&img=URL2 형식으로 최소 2개 이상의 이미지 URL이 필요합니다.', { status: 400 });
    }

    let images = [];

    try {
      const responses = await Promise.all(imgUrls.map(u => fetch(u)));

      const failedIndex = responses.findIndex(r => !r.ok);
      if (failedIndex !== -1) {
        return new Response(`이미지를 불러오는 데 실패했습니다: img[${failedIndex}] (${imgUrls[failedIndex]})`, { status: 500 });
      }

      const buffers = await Promise.all(responses.map(r => r.arrayBuffer()));
      images = buffers.map(buf => PhotonImage.new_from_byteslice(new Uint8Array(buf)));

      const base = images[0];
      for (let idx = 1; idx < images.length; idx++) {
        watermark(base, images[idx], 0n, 0n);
      }

      const outputBytes = base.get_bytes_webp();

      return new Response(outputBytes, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });

    } catch (error) {
      return new Response(`에러 발생: ${error.message}`, { status: 500 });
    } finally {
      images.forEach(img => img?.free());
    }
  }
};