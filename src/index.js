import { PhotonImage, watermark } from "@cf-wasm/photon";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const img1Url = url.searchParams.get('img1');
    const img2Url = url.searchParams.get('img2');

    if (!img1Url || !img2Url) {
      return new Response('img1과 img2 URL 파라미터가 필요합니다.', { status: 400 });
    }

    let image1, image2;

    try {
      const [res1, res2] = await Promise.all([
        fetch(img1Url),
        fetch(img2Url)
      ]);

      if (!res1.ok || !res2.ok) {
        return new Response('이미지를 불러오는 데 실패했습니다.', { status: 500 });
      }

      const [buf1, buf2] = await Promise.all([
        res1.arrayBuffer(),
        res2.arrayBuffer()
      ]);

      image1 = PhotonImage.new_from_byteslice(new Uint8Array(buf1));
      image2 = PhotonImage.new_from_byteslice(new Uint8Array(buf2));

      // image2를 image1 위 (0,0) 위치에 합성합니다.
      watermark(image1, image2, 0, 0);

      const outputBytes = image1.get_bytes_webp();

      return new Response(outputBytes, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });

    } catch (error) {
      return new Response(`에러 발생: ${error.message}`, { status: 500 });
    } finally {
      image1?.free();
      image2?.free();
    }
  }
};