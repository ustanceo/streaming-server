const NodeMediaServer = require('node-media-server');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

// Platform stream key'leri (environment variables'dan alınacak)
const PLATFORMS = {
  youtube: process.env.YOUTUBE_STREAM_KEY || '',
  facebook: process.env.FACEBOOK_STREAM_KEY || '',
  twitch: process.env.TWITCH_STREAM_KEY || '',
  instagram: process.env.INSTAGRAM_STREAM_KEY || ''
};

// Temel RTMP Server konfigürasyonu
const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8080,
    mediaroot: './media',
    allow_origin: '*'
  }
};

// Platform key'leri kontrolü ve relay konfigürasyonu
const activePlatforms = Object.entries(PLATFORMS).filter(([platform, key]) => key && key.length > 0);

if (activePlatforms.length > 0) {
  // FFmpeg path'lerini dene
  const possibleFFmpegPaths = [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    'ffmpeg'
  ];
  
  config.relay = {
    ffmpeg: possibleFFmpegPaths[0], // İlk path'i dene
    tasks: []
  };
  
  // Aktif platformlar için relay task'ları ekle
  activePlatforms.forEach(([platform, key]) => {
    switch(platform) {
      case 'youtube':
        config.relay.tasks.push({
          app: 'live',
          mode: 'push',
          edge: `rtmp://a.rtmp.youtube.com/live2/${key}`
        });
        break;
      case 'facebook':
        config.relay.tasks.push({
          app: 'live',
          mode: 'push',
          edge: `rtmp://live-api-s.facebook.com:80/rtmp/${key}`
        });
        break;
      case 'twitch':
        config.relay.tasks.push({
          app: 'live',
          mode: 'push',
          edge: `rtmp://ingest.twitch.tv/live/${key}`
        });
        break;
      case 'instagram':
        config.relay.tasks.push({
          app: 'live',
          mode: 'push',
          edge: `rtmp://live-upload.instagram.com/rtmp/${key}`
        });
        break;
    }
  });
}

const nms = new NodeMediaServer(config);

// Hata yakalama
nms.on('error', (err) => {
  console.log('❌ [HATA]', err.message);
});

// Web arayüzü
app.get('/', (req, res) => {
  const connectedPlatforms = activePlatforms.map(([platform]) => platform);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🚀 Çoklu Platform Streaming Server</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh; color: white;
            }
            .container { 
                max-width: 800px; margin: 0 auto; background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px); border-radius: 20px; padding: 30px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            }
            .status-card { 
                background: rgba(255,255,255,0.2); padding: 20px; border-radius: 15px;
                margin: 15px 0; border-left: 4px solid #4CAF50;
            }
            .warning-card { 
                background: rgba(255,193,7,0.2); padding: 20px; border-radius: 15px;
                margin: 15px 0; border-left: 4px solid #FFC107;
            }
            .error-card { 
                background: rgba(244,67,54,0.2); padding: 20px; border-radius: 15px;
                margin: 15px 0; border-left: 4px solid #f44336;
            }
            .platform-list {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px; margin: 20px 0;
            }
            .platform {
                background: rgba(255,255,255,0.15); padding: 15px; border-radius: 10px;
                text-align: center; transition: transform 0.3s ease;
            }
            .platform:hover { transform: translateY(-5px); }
            .platform.connected { border: 2px solid #4CAF50; }
            .platform.disconnected { border: 2px solid #f44336; }
            .rtmp-info {
                background: rgba(0,0,0,0.3); padding: 20px; border-radius: 15px;
                margin: 20px 0; font-family: 'Courier New', monospace;
            }
            .copy-btn {
                background: #4CAF50; color: white; border: none; padding: 8px 15px;
                border-radius: 5px; cursor: pointer; margin-left: 10px;
            }
            .copy-btn:hover { background: #45a049; }
            .stats {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px; margin: 20px 0;
            }
            .stat-card {
                background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;
                text-align: center;
            }
            .stat-number { font-size: 24px; font-weight: bold; color: #4CAF50; }
            h1 { text-align: center; margin-bottom: 30px; font-size: 2.5em; }
            h2 { color: #FFD700; margin-top: 30px; }
            code { background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Çoklu Platform Streaming Server</h1>
            
            <div class="status-card">
                <h3>✅ Server Durumu: Aktif</h3>
                <p>RTMP Streaming Server başarıyla çalışıyor!</p>
                <p><strong>Server URL:</strong> ${req.get('host')}</p>
            </div>
            
            <div class="rtmp-info">
                <h3>📡 RTMP Bağlantı Bilgileri</h3>
                <p><strong>RTMP URL:</strong> <code>rtmp://${req.get('host')}:1935/live</code> 
                   <button class="copy-btn" onclick="copyToClipboard('rtmp://${req.get('host')}:1935/live')">Kopyala</button></p>
                <p><strong>Stream Key:</strong> <code>test</code> 
                   <button class="copy-btn" onclick="copyToClipboard('test')">Kopyala</button></p>
            </div>
            
            <h2>🎯 Platform Durumu</h2>
            <div class="platform-list">
                <div class="platform ${connectedPlatforms.includes('youtube') ? 'connected' : 'disconnected'}">
                    <h4>📺 YouTube Live</h4>
                    <p>${connectedPlatforms.includes('youtube') ? '✅ Bağlı' : '❌ Bağlı değil'}</p>
                </div>
                <div class="platform ${connectedPlatforms.includes('facebook') ? 'connected' : 'disconnected'}">
                    <h4>📘 Facebook Live</h4>
                    <p>${connectedPlatforms.includes('facebook') ? '✅ Bağlı' : '❌ Bağlı değil'}</p>
                </div>
                <div class="platform ${connectedPlatforms.includes('twitch') ? 'connected' : 'disconnected'}">
                    <h4>🟣 Twitch</h4>
                    <p>${connectedPlatforms.includes('twitch') ? '✅ Bağlı' : '❌ Bağlı değil'}</p>
                </div>
                <div class="platform ${connectedPlatforms.includes('instagram') ? 'connected' : 'disconnected'}">
                    <h4>📷 Instagram Live</h4>
                    <p>${connectedPlatforms.includes('instagram') ? '✅ Bağlı' : '❌ Bağlı değil'}</p>
                </div>
            </div>
            
            ${connectedPlatforms.length === 0 ? `
            <div class="warning-card">
                <h3>⚠️ Platform Key'leri Ayarlanmamış</h3>
                <p>Çoklu platform yayını için Render.com dashboard'unda Environment Variables'ları ayarlamanız gerekiyor:</p>
                <ul>
                    <li><code>YOUTUBE_STREAM_KEY</code></li>
                    <li><code>FACEBOOK_STREAM_KEY</code></li>
                    <li><code>TWITCH_STREAM_KEY</code></li>
                    <li><code>INSTAGRAM_STREAM_KEY</code></li>
                </ul>
                <p>⚡ Şu anda sadece RTMP server çalışıyor. Platform key'leri ekledikten sonra otomatik relay başlayacak.</p>
            </div>
            ` : ''}
            
            <h2>📊 Server İstatistikleri</h2>
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number" id="activeStreams">0</div>
                    <div>Aktif Yayın</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${connectedPlatforms.length}</div>
                    <div>Bağlı Platform</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="uptime">0</div>
                    <div>Uptime (dakika)</div>
                </div>
            </div>
            
            <h2>📱 Telefon Uygulaması Ayarları</h2>
            <div class="rtmp-info">
                <h4>📲 Önerilen Uygulamalar:</h4>
                <ul>
                    <li><strong>Android:</strong> Larix Broadcaster, CameraFi Live, Simple RTMP Pusher</li>
                    <li><strong>iOS:</strong> Larix Broadcaster, Live:Air Action Cam, Broadcaster</li>
                </ul>
                
                <h4>⚙️ Önerilen Ayarlar:</h4>
                <ul>
                    <li><strong>Video Bitrate:</strong> 2000-3000 kbps</li>
                    <li><strong>Audio Bitrate:</strong> 128 kbps</li>
                    <li><strong>Resolution:</strong> 1280x720 (720p)</li>
                    <li><strong>FPS:</strong> 30</li>
                    <li><strong>Keyframe Interval:</strong> 2 saniye</li>
                </ul>
            </div>
            
            <h2>🔧 Test Etmek İçin</h2>
            <div class="rtmp-info">
                <p>1. Telefon uygulamanızı açın</p>
                <p>2. RTMP ayarlarına gidin</p>
                <p>3. Server URL: <code>rtmp://${req.get('host')}:1935/live</code></p>
                <p>4. Stream Key: <code>test</code></p>
                <p>5. Yayını başlatın</p>
                <p>6. Bu sayfayı yenileyin ve istatistikleri kontrol edin</p>
            </div>
        </div>
        
        <script>
            function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(() => {
                    alert('Kopyalandı: ' + text);
                }).catch(() => {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('Kopyalandı: ' + text);
                });
            }
            
            // Uptime sayacı
            let startTime = Date.now();
            setInterval(() => {
                const uptime = Math.floor((Date.now() - startTime) / 60000);
                document.getElementById('uptime').textContent = uptime;
            }, 60000);
            
            // Aktif stream sayısını kontrol et
            setInterval(() => {
                fetch('/api/stats')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('activeStreams').textContent = data.activeStreams || 0;
                    })
                    .catch(() => {
                        // Hata durumunda sessizce geç
                    });
            }, 5000);
        </script>
    </body>
    </html>
  `);
});

// API endpoint for stats
app.get('/api/stats', (req, res) => {
  try {
    // Node Media Server session bilgisini al
    const sessions = nms.getSession();
    const activeStreams = sessions ? Object.keys(sessions).length : 0;
    
    res.json({
      activeStreams: activeStreams,
      connectedPlatforms: activePlatforms.length,
      activePlatformsList: activePlatforms.map(([platform]) => platform)
    });
  } catch (error) {
    res.json({
      activeStreams: 0,
      connectedPlatforms: activePlatforms.length,
      activePlatformsList: activePlatforms.map(([platform]) => platform)
    });
  }
});

// Stream olaylarını dinle
nms.on('preConnect', (id, args) => {
  console.log('[📡 Bağlantı Girişimi]', `ID: ${id}`);
});

nms.on('postConnect', (id, args) => {
  console.log('[✅ Bağlantı Başarılı]', `ID: ${id}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[📤 Yayın Hazırlanıyor]', `Path: ${StreamPath}, ID: ${id}`);
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('🔴 [YAYIN BAŞLADI!]', `Path: ${StreamPath}, ID: ${id}`);
  if (activePlatforms.length > 0) {
    console.log(`📺 Yayın ${activePlatforms.length} platformda relay ediliyor!`);
    activePlatforms.forEach(([platform]) => {
      console.log(`  └─ ${platform}: Aktif`);
    });
  } else {
    console.log('📺 Sadece RTMP server aktif (Platform key\'leri ayarlanmamış)');
  }
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('⏹️ [YAYIN BİTTİ]', `Path: ${StreamPath}, ID: ${id}`);
});

nms.on('doneConnect', (id, args) => {
  console.log('[👋 Bağlantı Kesildi]', `ID: ${id}`);
});

// Server başlatma
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('🌐 Web Server:', `http://0.0.0.0:${PORT}`);
  console.log('📡 RTMP Server başlatılıyor...');
  console.log('🎯 Aktif Platformlar:', activePlatforms.length > 0 ? activePlatforms.map(([p]) => p).join(', ') : 'Henüz ayarlanmamış');
});

// Node Media Server başlat
try {
  nms.run();
  console.log('🚀 Çoklu Platform Streaming Server aktif!');
  console.log('📡 RTMP Port: 1935');
  console.log('🌐 HTTP Port:', PORT);
  console.log('📋 RTMP URL: rtmp://streaming-server-truf.onrender.com:1935/live');
  console.log('🔑 Stream Key: test');
} catch (error) {
  console.error('❌ Server başlatma hatası:', error.message);
}
