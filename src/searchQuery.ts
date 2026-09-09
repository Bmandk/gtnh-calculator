const special:string = "09azAZ";
const code0 = special.charCodeAt(0);
const code9 = special.charCodeAt(1);
const codea = special.charCodeAt(2);
const codez = special.charCodeAt(3);
const codeA = special.charCodeAt(4);
const codeZ = special.charCodeAt(5);
const charCount = 26+10;
const charOffset = 128-charCount;

export class SearchQuery
{
    original:string;
    words:string[];
    indexBits:Int32Array;
    mod:string | null;

    constructor(text:string)
    {
        this.original = text;
        this.words = [];
        this.indexBits = new Int32Array(4);
        this.mod = null;

        // Text wrapped in double quotes is treated as a single exact term that
        // must appear contiguously (including its spaces). Everything outside
        // quotes is tokenized into alphanumeric words as before.
        var regex = /"([^"]*)"|([^"]+)/g;
        var match:RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null)
        {
            if (match[1] !== undefined)
            {
                var phrase = match[1].toLowerCase();
                if (phrase.length === 0)
                    continue;
                this.words.push(phrase);
                this.AddBits(phrase);
            }
            else
            {
                var tokens = match[2].match(/[A-Za-z0-9@]+/g);
                if (tokens === null)
                    continue;
                for (var t=0; t<tokens.length; t++)
                {
                    var token = tokens[t];
                    if (token.startsWith('@')) {
                        this.mod = token.substring(1).toLowerCase();
                        continue;
                    }
                    var word = token.toLowerCase();
                    this.words.push(word);
                    this.AddBits(word);
                }
            }
        }
    }

    AddBits(word:string)
    {
        var len = word.length;
        var c1=-1, c2=-1;
        for (var j=0; j<len; j++) {
            var char = word.charCodeAt(j);
            var c0:number;
            if (char >= code0 && char <= code9)
                c0 = char - code0;
            else if (char >= codea && char <= codez)
                c0 = char - codea + 10;
            else if (char >= codeA && char <= codeZ)
                c0 = char - codeA + 10;
            else {
                // Reset context at non-alphanumeric chars (e.g. spaces inside a
                // quoted phrase) so we never build n-grams spanning the boundary.
                c1 = -1;
                c2 = -1;
                continue;
            }

            this.SetBit(charOffset + c0);
            if (c1 >= 0) {
                this.SetBit((c1 * charCount + c0)%charOffset);
                if (c2 >= 0)
                    this.SetBit(((c2 * charCount + c1)*charCount + c0)%charOffset);
            }

            c2 = c1;
            c1 = c0;
        }
    }

    SetBit(bitId:number)
    {
        var element = Math.trunc(bitId / 32);
        var bit = 1 << (bitId % 32);
        this.indexBits[element] |= bit;
    }

    Match(text: string | null): boolean
    {
        if (text === null)
            return false;
        var textLower = text.toLowerCase();
        for (var i=0; i<this.words.length; i++)
        {
            if (!textLower.includes(this.words[i]))
                return false;
        }
        return true;
    }
}