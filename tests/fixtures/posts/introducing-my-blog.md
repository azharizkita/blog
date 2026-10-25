## Introducing my Blog
First of all, I want to thank you for visiting my very first blog!

### How do I host this?
Some people may confused about my statement of "database-less blog". I mean, how can you do it without any DBs?

Well, actually, there are some tricky tricks to done this and *uhm* it is not literally a database-less blog.

At this point, I will not just `giving away the code` to you guys because I just don't want people to just copy it without any comperhension. I guess, we'll step into the `Main Idea` right now!

### Main idea!

Before we go any further, I recommend you to have a basic knowledge about the [GitHub API](https://docs.github.com/en "GitHub Docs") because I actually use that a lot on this web.

If you really pay attention, my [main page](https://azharizkita.lcsindonesia.com/ "Azhari Rizkita - Personal SIte") fetches my personal GitHub data, yes, using the GitHub API. It is as simple as

```javascript
const octo = new Octokit({ auth: 'my_very_secreat_personal_auth_key' })
const { data } = await octo.request('GET /users/azharizkita/gists')
```
The code simply gives you an array of my public gists. Then you can parse the data and make your own UI out of that (which will be better than mine, probably).

### So does the Blog part!
I store my blogs on my github [gist](https://gist.github.com/azharizkita "My personal gist"). You may wonder "how do I show the content into my HTML?". Don't wory, I did wonder the same thought too.

Which I found surprisingly easy (thanks to this [markdown-it](https://preview.npmjs.com/package/markdown-it) package). It is as simple as the code below.

```javascript
const md = new Markdown();
const content = md.render(data.files['index.md'].content);
```

This line of code parses the raw `.md` file into a rendered HTML code.

Unfortunately, it comes without any styling so you need to do it manually. What? You don't want to style it? Fine. Here is mine.

```css
.blog {
    @apply text-gray-900;
    @apply space-y-6;
    @apply text-justify;
	@apply pb-6;
}

.blog h2 {
    @apply font-black;
    @apply text-2xl
}

.blog h3 {
    @apply font-black;
    @apply text-xl
}

.blog h4 {
    @apply font-black;
    @apply text-lg
}

.blog a {
    @apply underline;
	@apply text-red-600;
	@apply font-semibold
}

.blog code {
	@apply px-2;
	@apply bg-gray-200;
	@apply rounded-md;
}
.blog pre {
	@apply p-4;
	@apply overflow-auto;
	@apply whitespace-pre;
	@apply bg-gray-200;
	@apply rounded-md;
}
```
Since I am sooooo lazy to style things, take a note that this is only for some important tags. Be creative (don't be like me).

And there it is the whole idea about the concept of my "database-less blog". I hope this blog able to open up people's mind about that concept. Have a nice day!