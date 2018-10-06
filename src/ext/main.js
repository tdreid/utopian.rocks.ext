var sc2_api = sc2.Initialize({
	app: 'utopian-ext.app',
	callbackURL: 'https://join.utopian.io/',
	accessToken: '',
	scope: ['comment']
});
window.auth_link = sc2_api.getLoginURL()

$(document).ready(function(){
	chrome.runtime.onMessage.addListener(msgReceived); // Message listener
		function msgReceived(message, sender, sendResponse){
			if(message.request === "status"){ // Check what the purpose of the message is.
				displayStatus(message) // placeholder function
			}
			else if(message.request === "broadcast"){

				chrome.storage.local.get(function(result){
					submitPost(result.content, result.sc2_token)
				})
			}
			else{
				console.log("Unknown request")
			}

			if(message.url === "https://steemit.com/submit.html"){
				displayUtopianAids(message.url)
			}
		}

	$('head').append(`<link rel="stylesheet" type="text/css" href="${chrome.extension.getURL('src/ext/style.css')}">`)
	$('body').append(`<script type="text/javascript" src="${chrome.extension.getURL('src/third_party/jquery.js')}"></script>\
					  <script src="https://cdn.jsdelivr.net/npm/steemconnect@latest"></script>`)

	if(window.location.href.includes('?access_token=')){
		chrome.runtime.sendMessage({ // Send a request for the status of the contribution.
			request: "token"
		})
	}
	else{
		chrome.runtime.sendMessage({ // Send a request for the status of the contribution.
			request: "status"
		})
	}
})

function displayUtopianAids(url){
	$('.ReplyEditor__body').after('<p id="utopian-tags">\
	<strong>Select an Utopian-io category:</strong>\
	<button id="analysis">analysis</button>, <button id="blog">blog</button>, <button id="bug-hunting">bug-hunting</button>,\
	<button id="copywriting">copywriting</button>, <button id="development">development</button>,\
	<button id="documentation">documentation</button>, <button id="graphics">graphics</button>, <button id="ideas">ideas</button>,\
	<button id="social">social</button>, <button id="translations">translations</button>, <button id="tutorials">tutorials</button>,\
	<button id="video-tutorials">video-tutorials</button>, <button id="task-requests">task-requests</button>;</p>')
	
	$('#utopian-tags').after('<a href="https://utopian.io/guidelines/">Utopian Guidelines</a>')

	$('body').append('<div id="templateOverwriteModal" class="modal"><div class="modal-content">\
		<p>You\'re about to overwrite your changes with an Utopian Template.<br> Are you sure you want to continue?</p>\
		<button id="templateOverwriteYes">Yes</button> <button id="templateOverwriteNo">No</button>')

	$('body').append('<div id="steemConnectModal" class="modal"><div class="modal-content">\
		<p>You\'re about to leave this page to sing in with SteemConnect.<br>\
		Your draft will be saved by steemit.com and your post will be published by Utopian.<br><br>Are you sure you want to continue?</p>\
		<button id="scModalYes">Yes</button> <button id="scModalNo">No</button>')

	$('#analysis, #blog, #bug-hunting, #copywriting, #development, #documentation, #graphics, #ideas, #social, #translations, \
   	   #tutorials, #video-tutorials, #task-requests').click(function(){
   	   	console.log(this.textContent);
	   	loadTemplateModal(this.textContent);
   	})
    
    $('input[name="category"]').after('<butt class="utopian-button" id="utopian-submit"><span title="Post with Utopian">\
       <strong>Post with Utopian</strong></span></button><br>')

    $('#utopian-submit').click(function(){
    	loadScModal();
    })
}

function loadTemplateModal(category){
	if($('.dropzone textarea')[0].value === ""){
		forceTemplateHTML();
	}
	else{
		let modal = $('#templateOverwriteModal');
		modal.show()

		$('#templateOverwriteNo').click(function(){
			modal.hide();
		})
		$('#templateOverwriteYes').click(function(){
			modal.hide();
			forceTemplateHTML();
		})

	}

	function forceTemplateHTML(){
		$.get(chrome.extension.getURL(`src/third_party/templates/${category}`), function(data){
			$('.dropzone textarea')[0].value = data;
			$('input[name=category]')[0].value = `utopian-io ${category}`
		})
	}
}

function loadScModal(){
	let modal = $('#steemConnectModal');
	modal.show()

	$('#scModalNo').click(function(){
		modal.hide();
	})

	$('#scModalYes').click(function(){
		let temp = gatherPostContent()
		if(temp){
			window.location.href = window.auth_link
		}
		else(
			alert("Your Title, Body or Tags are empty!")
		)

		chrome.storage.local.set({content : gatherPostContent()})
	})
}

function gatherPostContent(){
	let post = {
		title: $('.ReplyEditor__title')[0].value,
		body: $('.dropzone textarea')[0].value,
		tags: $('input[name=category]')[0].value//,
		//tip: 

	}

	if(post.body === "" || !post.tags === "" || post.title === ""){
		return false;
	}
	else{
		return post;
	}
}

function displayStatus(message){ //placeholder function
	console.log(message)
	if(message.status !== undefined){

		$('.PostFull__footer').prepend('<div class="utopian-rocks"></div>')
		$('.utopian-rocks').append('<a target="_blank" href="https://utopian.rocks/queue" id="utopian-rocks-btn"></a>')

		let iconUrl = chrome.extension.getURL(`src/icons/${message.status}-icon.png`); // Need SVG for this to work.
		$('#utopian-rocks-btn').prepend(`<img src="${iconUrl}" title="Status: ${message.status}" id="status-icon"></img>`)

		if(message.status === "pending"){
			$('#utopian-rocks-btn').after(`<p id="status-message">Position in the Voting Queue: <strong>${message.position}</strong>.</p>`)
		}
		else if(message.status === "voted"){
			$('#utopian-rocks-btn').after(`<p id="status-message">This post has been Upvoted!</p>`)
		}
		else if(message.status === "unreviewed"){
				$('#utopian-rocks-btn').after(`<p id="position">This post is awaiting a review.</p>`)
		}
		else if(message.status === "rejected"){
			$('#utopian-rocks-btn').after(`<p id="position">This post has received a score of 0.</p>`)
		}
		else if(message.status === "underreview"){
			$('#utopian-rocks-btn').after(`<p id="position">This post is under a review by <strong>${message.moderator}</strong>.</p>`)
		}
	}	
}

function submitPost(content, token){
	sc2_api.setAccessToken(token)

	let user = sc2_api.me(function (err, res) {
  		console.log(err, res)
	});

	let permlink = content.title.toLowerCase()
	.replace(/ /g,'-')
    .replace(/[^\w-]+/g,'');

    let tags = content.tags.split(' ')
    let title = content.title;
    let body = content.body;
    let sbd_percent = 10000;
    let maximumAcceptedPayout = '100000.000 SBD';

    let beneficiaries = []
    beneficiaries.push({
    	account:'utopian.pay',
    	weight: 100*5
	})

	let operations = [
		['comment',
      	{
	        parent_author: '',
	        parent_permlink: tags[0],
	        author: user,
	        permlink: permlink,
	        title: title,
	        body: body,
	        json_metadata : JSON.stringify({
	          tags: tags,
	          app: 'utopian-ext.app'
	        })
      	}
      	],
	    ['comment_options', {
	        author: user,
	        permlink: permlink,
	        max_accepted_payout: maximumAcceptedPayout,
	        percent_steem_dollars: parseInt(sbd_percent),
	        allow_votes: true,
	        allow_curation_rewards: true,
	        extensions: [
	        [0, {
	          beneficiaries: beneficiaries
	        }]
	        ]
	    }]
	    ];

	sc2_api.broadcast(operations)
}
