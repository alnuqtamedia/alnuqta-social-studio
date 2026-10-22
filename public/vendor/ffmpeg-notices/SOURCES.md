# FFmpeg browser export

The JavaScript wrapper is @ffmpeg/ffmpeg 0.12.15 (MIT, Jerome Wu).
The unmodified single-thread core is @ffmpeg/core 0.12.10, downloaded from
npm by the locked build. The compiled core is not covered by the wrapper's MIT
license. Its FFmpeg and enabled GPL codecs retain their own licenses.

Upstream source and build recipes for the core:
https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main
https://github.com/ffmpegwasm/ffmpeg.wasm/releases/tag/v0.12.10
https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/build
https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/Dockerfile

FFmpeg source, n5.1.4:
https://github.com/FFmpeg/FFmpeg/tree/n5.1.4
https://github.com/FFmpeg/FFmpeg/archive/refs/tags/n5.1.4.tar.gz

Core components and upstream source references:
https://ffmpegwasm.netlify.app/docs/overview/#libraries
https://code.videolan.org/videolan/x264
https://bitbucket.org/multicoreware/x265_git

The application communicates with this unmodified program in a separate worker.
No FFmpeg core source modifications are made. Keep this notice, upstream source
references, license texts, and npm integrity lock when redistributing the bundle.
