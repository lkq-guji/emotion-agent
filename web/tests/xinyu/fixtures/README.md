# 场景视频工程素材

`scene-test.mp4` 是测试用的 2 秒、160×90、24fps 合成色条视频，含 440Hz 测试音轨，用于确认本地视频有移动帧、循环且始终静音。它不是产品默认场景，不从 public 发布。

重建命令（在项目目录）：

```powershell
ffmpeg -hide_banner -loglevel error -y -f lavfi -i testsrc2=size=160x90:rate=24:duration=2 -f lavfi -i sine=frequency=440:duration=2 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest tests/xinyu/fixtures/scene-test.mp4
```
