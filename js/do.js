var app = new Vue({
    el: '#app',
    data: {
        size: 600,
        cvsHeight: 600,
        background: './res/tp1.jpg',
        texts: [],
        qrCodes: [],
        variables: [],
        currentText: 0,
        currentQr: 0,
        currentTab: 0
    },
    watch: {
        text: {
            handler () {
                this.refresh()
            },
            deep: true
        },
        qrCode: {
            handler () {
                this.refresh()
            },
            deep: true
        },
        variables: {
            handler () {
                this.refresh()
            },
            deep: true
        },
        size (n, o) {
            let ratio = n / o;
            this.texts.forEach(t => {
                t.coord.x = parseInt(t.coord.x * ratio);
                t.coord.y = parseInt(t.coord.y * ratio);
                t.size = parseInt(t.size * ratio);
            });

            this.qrCodes.forEach(q => {
                q.coord.x = parseInt(q.coord.x * ratio);
                q.coord.y = parseInt(q.coord.y * ratio);
                q.size = parseInt(q.size * ratio);
            })
        }
    },
    computed: {
        cvs(){
            return this.$refs['cvs'];
        },
        ctx(){
            return this.$refs['cvs'].getContext('2d');
        },
        text() {
            return this.texts[this.currentText];
        },
        qrCode() {
            return this.qrCodes[this.currentQr];
        },
        qrResult() {
            return this.qrCode.content.format.apply(this.qrCode.content, (this.variables || [['']])[0].map(encodeURIComponent))
        },
        vars: {
            get() {
                return (this.variables || []).map(v => v.join(',')).join('\n');
            },
            set(val) {
                let vars = val.trim().split('\n').map(v => v.replace(/^,|,$/g, '').split(','));
                if (this.vars != (vars || []).map(v => v.join(',')).join('\n'))
                    this.variables = vars;
            }
        }
    },
    methods: {
        addText() {
            this.texts.push({
                content: 'text node ' + this.texts.length,
                font: 'Noto Sans SC',
                size: 20, 
                coord: { x: 0, y: 0 },
                color: '#000',
                align: 'left',
                variable: false
            });
            this.currentText = this.texts.length - 1
        },
        addQr() {
            this.qrCodes.push({
                content: 'Qr ' + this.qrCodes.length,
                color: '#000',
                size: 100,
                coord: { x: 0, y: 0 },
                variable: false,
                color: {
                    foreground:'#000', 
                    background:'#fff'
                }
            })
            this.currentQr = this.qrCodes.length - 1
        },
        downloadAll() {
            var download = (index) => {
                this.draw(index, (i) => {
                    if (i < 0) return alert('All Downloaded');
                    this.downloadFile(`${index}.png`, this.cvs.toDataURL('image/png'));
                    setTimeout(() => {
                        download(index - 1)
                    }, 1000);
                })
            }
            download(this.variables.length - 1)
        },
        exportConfig() {
            var config = {
                size: this.size,
                background: this.background,
                texts: this.texts.map(t => Object.assign({}, t)),
                qrCodes: this.qrCodes.map(q => Object.assign({}, q))
            }
            var cvs = document.createElement('canvas');
            var cxt = cvs.getContext('2d');
            var image = new Image;
            image.src = this.background;
            image.onload = () => {
                cvs.width = image.width;
                cvs.height = image.height;
                cxt.drawImage(image, 0, 0, image.width, image.height);
                config.background = cvs.toDataURL();
                var blob = new Blob([JSON.stringify(config, null, 4)]);
                this.downloadFile('config.json', URL.createObjectURL(blob))
            }
        },
        changeImg() {
            if(this.$refs['img'].files.length == 0) return
            this.background = window.URL.createObjectURL(this.$refs['img'].files[0]);
            this.refresh();
            this.$refs['img'].value = '';
        },
        changeConfig() {
            if(this.$refs['cfg'].files.length == 0) return
            var reader = new FileReader();
            reader.onload = (event) => {
                this.loadConfig(JSON.parse(event.target.result));
            };
            reader.readAsText(this.$refs['cfg'].files[0]);
            this.$refs['cfg'].value = '';
        },
        loadConfig(config) {
            this.background = config.background;
            this.size = config.size;
            this.texts = config.texts;
            this.qrCodes = config.qrCodes;
            this.variables = config.variables;
            this.currentText = 0;
            this.currentQr = 0;
            this.refresh();
        },
        removeText(i) {
            if(i == this.currentText) this.currentText = 0;
            this.texts.splice(i, 1);
        },
        removeQr(i) {
            if(i == this.currentQr) this.currentQr = 0;
            this.qrCodes.splice(i, 1);
        },
        refresh() {
            this.draw(0);
        },
        draw(index, call) {
            this.drawImg(this.background,  () => {
                for (let i = 0; i < this.texts.length; i++) {
                    let text = Object.assign({}, this.texts[i]);
                    if (text.variable) {
                        text.content = text.content.format.apply(text.content, (this.variables[index] || []));
                    }
                    this.drawText(text);
                }
                if (this.qrCodes.length > 0) {
                    var drawQr = (i) => {
                        if (this.qrCodes.length <= i) return call && call(index);
                        let qrCode = Object.assign({}, this.qrCodes[i]);
                        if (qrCode.variable) {
                            qrCode.content = qrCode.content.format.apply(qrCode.content, (this.variables[index] || []).map(encodeURIComponent));
                        }    
                        this.drawQr(qrCode, () => {
                            drawQr(i + 1);
                        });
                    }
                    drawQr(0);
                }
            }, 0, 0, this.size);
        },
        drawImg(img, call, x=0, y=0, size=400, resize=true){
            var image = new Image;
            image.src = img;
            image.onload =  () => {
                var radio = size / image.width;
                var width = size; //image.width;
                var height = image.height * radio;
                if (resize) {
                    this.cvs.width = width;
                    this.cvs.height = height;
                    this.cvsHeight = height;
                }
            
                this.ctx.drawImage(image, x, y, width, height);
                if (call) call();
            }
        },
        drawText({font='Noto Sans SC', content, size=20, coord={x:0,y:0}, color='#000', align='left'}) {
            this.ctx.font = `${size}px "${font}"`;
            this.ctx.fillStyle = color;
            this.ctx.textAlign = align;
            this.ctx.fillText(content, coord.x, coord.y);
        },
        drawQr({content, coord={x:0,y:0}, size=100, color={foreground:'#000', background:'#fff'}}, call) {
            var qr = document.createElement('div');
            var q = new QRCode(qr, {
                text: content,
                width: size,
                height: size,
                colorDark : color.foreground,
                colorLight : color.background,        
            });
            var image = new Image;
            image.src = qr.getElementsByTagName('canvas')[0].toDataURL("image/png");
            q.clear();
            image.onload = () => {
                this.ctx.drawImage(image, coord.x, coord.y, size, size);
                if(call) call()
            }
        },
        downloadFile(fileName, BlobUrl){
            var aLink = document.createElement('a');
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent("click", false, false);
            aLink.download = fileName;
            aLink.href = BlobUrl;
            aLink.click();
        }
    },
    mounted: function () {
        this.loadConfig(configs[0]);
    }
});