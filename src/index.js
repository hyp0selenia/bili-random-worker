export default {

async fetch(request, env) {


    /*
     * 从 Cloudflare KV 获取视频列表
     *
     * KV:
     * Key: videos
     *
     * Value:
     * [
     *   "BVxxxxxxxx",
     *   "BVyyyyyyyy"
     * ]
     */

    const videos = await env.VIDEOS.get(
        "videos",
        "json"
    );


    if (!videos || videos.length === 0) {

        return new Response(
            "No videos found in KV",
            {
                status: 404
            }
        );

    }



    // 随机选择 BV

    const bv =
        videos[
            Math.floor(
                Math.random() * videos.length
            )
        ];



    const html = `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,
initial-scale=1.0">


<title>Bili Random Player</title>


<style>

html,
body {

    margin:0;
    padding:0;

    width:100%;
    height:100%;

    background:#000;

    overflow:hidden;

}


iframe {

    position:absolute;

    left:0;
    top:0;

    width:100%;
    height:100%;

    border:none;

}


</style>


</head>


<body>


<iframe

src="https://player.bilibili.com/player.html?bvid=${bv}&autoplay=1&danmaku=0"

allow="autoplay; fullscreen"

allowfullscreen>

</iframe>


</body>


</html>

`;



    return new Response(
        html,
        {
            headers:{
                "content-type":
                "text/html;charset=UTF-8",

                // 禁止缓存，否则刷新可能还是同一个视频

                "cache-control":
                "no-store"
            }
        }
    );


}

};