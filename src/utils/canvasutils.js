import { CONFIG } from 'sttapi';

class SimpleCanvas {
    constructor(canvas, onSelectionChanged) {
        this.canvas = canvas;
        this.onSelectionChanged = onSelectionChanged;
        this.ctx = canvas.getContext('2d');

        if (document.defaultView && document.defaultView.getComputedStyle) {
            this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, undefined)['paddingLeft'], 10) || 0;
            this.stylePaddingTop = parseInt(document.defaultView.getComputedStyle(canvas, undefined)['paddingTop'], 10) || 0;
            this.styleBorderLeft = parseInt(document.defaultView.getComputedStyle(canvas, undefined)['borderLeftWidth'], 10) || 0;
            this.styleBorderTop = parseInt(document.defaultView.getComputedStyle(canvas, undefined)['borderTopWidth'], 10) || 0;
        }

        let html = document.body.parentNode;
        this.htmlTop = html.offsetTop;
        this.htmlLeft = html.offsetLeft;

        // State
        this.valid = false; // when set to false, the canvas will redraw everything
        this.shapes = [];

        // Hook canvas events

        this.canvas.addEventListener('selectstart', (e) => { e.preventDefault(); return false; }, false);

        let me = this;
        this.canvas.addEventListener('mousedown', (e) => me.mouseDown(e), true);
    }

    get width() {
        return this.canvas.width;
    }

    get height() {
        return this.canvas.height;
    }

    reset() {
        this.shapes.splice(0, this.shapes.length);
        this.valid = false;
    }

    mouseDown(e) {
        let mouse = this.getMouse(e);
        for (let shape of this.shapes) {
            shape.mouseDown(mouse.x, mouse.y);
        }
        this.valid = false;
        this.onSelectionChanged();
    }

    addShape(shape) {
        this.shapes.push(shape);
        this.valid = false;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(backgroundCallback) {
        if (this.valid) {
            return false;
        }

        // if our state is invalid, redraw and validate!
        this.clear();

        backgroundCallback(this.ctx);

        for (let shape of this.shapes) {
            // We can skip the drawing of elements that have moved off the screen:
            if (shape.x > this.canvas.width || shape.y > this.canvas.height ||
                shape.x + shape.w < 0 || shape.y + shape.h < 0) {
                continue;
            }
            shape.draw(this.ctx);
        }

        this.valid = true;
        return true;
    }

    getMouse(e) {
        let offsetX = 0;
        let offsetY = 0;

        // Compute the total offset
        let canvas = this.canvas;
        if (canvas.offsetParent) {
            do {
                offsetX += canvas.offsetLeft;
                offsetY += canvas.offsetTop;
            } while (canvas = canvas.offsetParent);
        }

        // Add padding and border style widths to offset
        // Also add the <html> offsets in case there's a position:fixed bar
        offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
        offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

        let rect = this.canvas.getBoundingClientRect(); // abs. size of element
        let scaleX = this.canvas.width / rect.width;
        let scaleY = this.canvas.height / rect.height;

        return {
            x: (e.pageX - offsetX) * scaleX,
            y: (e.pageY - offsetY) * scaleY
        };
    }
}

const NODE_SIZE = 64;
const scale = (val) => val * NODE_SIZE / 128;

export class MissionDisplay {
    constructor(canvas, maxX, maxY, onSelectionChanged) {
        this.onSelectionChanged = onSelectionChanged;
        this.canvas = new SimpleCanvas(canvas, () => this._onSelectionChanged());

        this.nodeImg = this.loadSprite('node_icon');
        this.starImg = this.loadSprite('star_reward');

        this.skillImg = {};
        for(let skill in CONFIG.SKILLS) {
            this.skillImg[skill] =  this.loadSprite('icon_' + skill);
        }

        this.maxX = maxX;
        this.maxY = maxY;

        this.interval = 60;
        setInterval(() => this.draw(), this.interval);
    }

    _onSelectionChanged() {
        for(let node of this.canvas.shapes) {
            if (node.selected) {
                this.onSelectionChanged(node.id);
            }
        }
    }

    reset(maxX, maxY) {
        this.canvas.reset();

        this.maxX = maxX;
        this.maxY = maxY;
    }

    loadSprite(spriteName) {
        let img = new Image();
        img.src = CONFIG.SPRITES[spriteName].url;
        img.onload = () => { this.canvas.valid = false; };
        return img;
    }

    addNode(grid_x, grid_y, skill, crit, links, id, name) {
        const PADDING = 20;

        let x_val = (this.canvas.width - (PADDING * 2)) / this.maxX;
        let y_val = (this.canvas.height - (PADDING * 2)) / this.maxY;
        let actualX = PADDING + grid_x * x_val + Math.max(0, x_val - NODE_SIZE) / 2;
        let actualY = PADDING + (this.maxY - grid_y - 1) * y_val + Math.max(0, y_val - NODE_SIZE) / 2;

        let node = new Node(actualX, actualY, this, skill, crit, links, id, name);
        this.canvas.addShape(node);
    }

    draw() {
        this.canvas.draw((ctx) => {
            // background
            ctx.beginPath();
            ctx.rect(2, 2, this.canvas.width - 2, this.canvas.height - 2);
            ctx.fillStyle = "#00070d";
            ctx.fill();

            // draw lines between nodes
            let pairs = [];
            for(let node of this.canvas.shapes) {
                for(let id of node.links) {
                    let other = this.canvas.shapes.find(s => s.id === id);
                    pairs.push({from: node, to: other});
                }
            }

            const lineCoord = (node) => {return {x: (node.x + NODE_SIZE / 2), y: (node.y + NODE_SIZE - scale(this.nodeImg.height) / 2)}; };
            for(let pair of pairs) {
                ctx.beginPath();

                let fromCoord = lineCoord(pair.from);
                ctx.moveTo(fromCoord.x, fromCoord.y);

                let toCoord = lineCoord(pair.to);
                ctx.lineTo(toCoord.x, toCoord.y);
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#ced3d7";
                ctx.stroke();
            }
        });
    }
}

class Node {
    constructor(x, y, missionDisplay, skill, crit, links, id, name) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = NODE_SIZE;
        this.height = NODE_SIZE;
        this.selected = false;

        this.missionDisplay = missionDisplay;
        this.skill = skill;
        this.crit = crit;
        this.links = links;
        this.id = id;
        this.name = name;
    }

    mouseDown(mx, my) {
        this.selected = ((this.x <= mx) && (this.x + this.width >= mx) && (this.y <= my) && (this.y + this.height >= my));
    }

    draw(ctx) {
        // Done loading images?
        if (!this.missionDisplay.nodeImg || !this.missionDisplay.starImg || !this.missionDisplay.skillImg[this.skill]) {
            return;
        }

        const scaleStar = (val) => val / 3;

        // Draw the node (circle) thingie
        ctx.drawImage(this.missionDisplay.nodeImg,
            this.x + ((NODE_SIZE - scale(this.missionDisplay.nodeImg.width)) / 2),
            this.y + (NODE_SIZE - scale(this.missionDisplay.nodeImg.height)),
            scale(this.missionDisplay.nodeImg.width),
            scale(this.missionDisplay.nodeImg.height));

        if (this.selected) {
            // TODO: this whole thing is dumb, we should have a preloaded "selected node" img and draw that instead

            // Invert the node colors if selected
            let nodeImageData = ctx.getImageData(this.x + ((NODE_SIZE - scale(this.missionDisplay.nodeImg.width)) / 2),
                this.y + (NODE_SIZE - scale(this.missionDisplay.nodeImg.height)),
                scale(this.missionDisplay.nodeImg.width),
                scale(this.missionDisplay.nodeImg.height));

            for (let i = 0; i < nodeImageData.data.length; i += 4) {
                nodeImageData.data[i] = 255 - nodeImageData.data[i]; // red
                nodeImageData.data[i + 1] = 255 - nodeImageData.data[i + 1]; // green
                nodeImageData.data[i + 2] = 255 - nodeImageData.data[i + 2]; // blue
            }
            ctx.putImageData(nodeImageData,
                this.x + ((NODE_SIZE - scale(this.missionDisplay.nodeImg.width)) / 2),
                this.y + (NODE_SIZE - scale(this.missionDisplay.nodeImg.height)));

            ctx.drawImage(this.missionDisplay.nodeImg,
                this.x + ((NODE_SIZE - scale(this.missionDisplay.nodeImg.width)) / 2),
                this.y + (NODE_SIZE - scale(this.missionDisplay.nodeImg.height)),
                scale(this.missionDisplay.nodeImg.width),
                scale(this.missionDisplay.nodeImg.height));
        }

        if (this.crit) {
            ctx.drawImage(this.missionDisplay.starImg,
                this.x + ((NODE_SIZE - scaleStar(this.missionDisplay.starImg.width)) / 2),
                this.y + (NODE_SIZE - scaleStar(this.missionDisplay.starImg.height) / 2),
                scaleStar(this.missionDisplay.starImg.width),
                scaleStar(this.missionDisplay.starImg.height));
        }

        // Now draw the skill image
        let simg = this.missionDisplay.skillImg[this.skill];

        let sx = (NODE_SIZE - scale(simg.width)) / 2;
        let sy = Math.min(0, Math.floor(NODE_SIZE * 3 / 4) - scale(simg.height));

        ctx.drawImage(simg, this.x + sx, this.y + sy, scale(simg.width), scale(simg.height));

        ctx.font = "22px Helvetica";
        ctx.fillStyle = "#ced3d7";
        ctx.textAlign = "center";
        ctx.fillText(this.id, this.x + (NODE_SIZE / 2), this.y + NODE_SIZE + 18);

        // TODO: if we print the labels, the UI is too crowded
        /*ctx.font = "10px Helvetica";
        ctx.fillStyle = "#ced3d7";
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x + (NODE_SIZE / 2), this.y + NODE_SIZE + 30);*/
    }
}
