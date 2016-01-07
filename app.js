/*!
 * Instagram Manager App v1.0.0
 * http://bellroyinstagram.friebaseapp.com/
 *
 * Released under the MIT license
 *
 * Date: 2016-01-07
 */
var selectedPhotos      = {
    'photos' : []
}
var alerted             = false
//Primitive Model of the DB to be stored locally - don't judge me
var currentDB           = {}
var myClientId
var slackHookKey
var instagramAPIKey
var loadMore
var bellroyFeed
var searchFeed


//Checks to see if the user is logged in
if(sessionStorage.getItem('firebase:session::bellroyinstagram')){
        $('#contentWrapper').show()
        $('#loggedIn').html('Logged in as ' + JSON.parse(sessionStorage.getItem('firebase:session::bellroyinstagram')).password.email + '<div><button id="logOut">Log out</button></div>')
        $('#loggedIn').show()
        $('#login').hide()
}
//if Logged in connects to the database and adds a bunch of DB event listners
var myDataRef = new Firebase('https://bellroyinstagram.firebaseio.com/')
myDataRef.orderByKey().on('value', function(snapshot) {
    currentDB = snapshot.val()
    myClientId = currentDB.clientID
    slackHookKey = currentDB.slackHookKey
    instagramAPIKey = currentDB.instagramAPIKey
    updateSavedImages()
})
myDataRef.orderByKey().on("child_added", function(snapshot) {
    currentDB = snapshot.val()
    updateSavedImages()
})
myDataRef.orderByKey().on("child_changed", function(snapshot) {
    currentDB = snapshot.val()
    updateSavedImages()
})
myDataRef.orderByKey().on("child_removed", function(snapshot) {
    currentDB = snapshot.val()
    updateSavedImages()
})
//Stickies the function bar
$(window).scroll(function(){
    if($(document).scrollTop() > 395){
        $('#manipulateWrapper').css(
            {   'position': 'fixed',
                'top': '0px',
                'width': '100%',
                'background': 'lightgray',
                'padding': '10px',
                'margin-top': '0px',
            })
    }else{
        $('#manipulateWrapper').attr('style', '')
    }
})

//AUTH STUFF
//logs the user in
$('#login button').click(function(){
    myDataRef.authWithPassword({
      email    : $('#username').val(),
      password : $('#password').val()
    }, function(error, authData) {
      if (error) {
        alert("Login Failed!", error)
      } else {
        $("#spinner").hide()
        alert("Authenticated successfully")
        var myLoginRef = new Firebase('https://bellroyinstagram.firebaseio.com/')
        myLoginRef.orderByKey().on('value', function(snapshot) {
            currentDB = snapshot.val()
            myClientId = currentDB.clientID
            slackHookKey = currentDB.slackHookKey
            instagramAPIKey = currentDB.instagramAPIKey
            updateSavedImages()
        })
        $('#contentWrapper').show()
        $('#loggedIn').html('Logged in as ' + authData.password.email + '<div><button id="logOut">Log out</button></div>')
        $('#loggedIn').show()
        $('#login').hide()
        sessionStorage.setItem('auth', 'true')
      }
    }, {
      remember: "sessionOnly"
    })
})
//Enter triggers click
$('#login').keypress( function( e ) {
  var code = e.keyCode || e.which

  if( code === 13 ) {
    $("#spinner").show()
    $('#login button').click()
  }
})
//logs the user out
$(document).on('click', '#logOut', function(){
    myDataRef.unauth()
    $('#contentWrapper').hide()
    $('#loggedIn').hide()
    $('#login').show()
    $('#instafeed').empty()
    $('#savedCollectionsWrapper').hide()
})
//INSTAGRAM STUFF
//gets the @bellroy images
$('#bellroybutton').click(function(){
    $("#spinner").show()
    loadMore='user'
    var sort = $('select option:selected').attr('value')
    $('.instafeedPhoto img').each(function(index, element){
        if(!$(element).hasClass('selected')){
            $(element).closest('.instafeedPhoto').remove()
        }
    })
    bellroyFeed = new Instafeed({
        get: 'user',
        clientId: myClientId,
        accessToken: instagramAPIKey,
        userId: 3794338,
        resolution: 'standard_resolution',
        sortBy: sort,
        limit: 60,
        template: '<div class="instafeedPhoto" caption="{{caption}}" likes="{{likes}}" comments="{{comments}}" ><a href="{{link}}"><img src="{{image}}" /></a></div>',
        success: function(data){
            $("#spinner").hide()
        },
        after: function() {
            // disable button if no more results to load
            if (!this.hasNext()) {
            loadButton.setAttribute('disabled', 'disabled')
            }
        }
    })
    bellroyFeed.run()
    $('#loadMore').delay(2000).fadeIn(400)
})
//searches instagram for the entered query
$('#searchbutton').click(function(){
    $("#spinner").show()
    loadMore='search'
    var sort = $('select option:selected').attr('value')
    $('.instafeedPhoto img').each(function(index, element){
        if(!$(element).hasClass('selected')){
            $(element).closest('.instafeedPhoto').remove()
        }
    })
    var input  = $('#searchbar').val()
    var target = 'tagged'
    searchFeed = new Instafeed({
        get: target,
        tagName: input,
        clientId: myClientId,
        resolution: 'standard_resolution',
        sortBy: sort,
        limit: 60,
        template: '<div class="instafeedPhoto"><a href="{{link}}"><img src="{{image}}" /></a></div>',
        success: function(data){
            $("#spinner").hide()
        },
        after: function() {
            // disable button if no more results to load
            if (!this.hasNext()) {
            $('#loadButton').hide()
            }
        }
    })
    searchFeed.run()
    $('#loadMore').delay(2000).fadeIn(1000)
})
//Enter triggers click
$('#searchbar').keypress( function( e ) {
  var code = e.keyCode || e.which

  if( code === 13 ) {
    $('#searchbutton').click()
  }
})
//loads more images from instagram
$('#loadMore').click(function(){
    if(loadMore === 'search'){
        $("#spinner").show()
        searchFeed.next()
    }
    if(loadMore==='user'){
        $("#spinner").show()
        bellroyFeed.next()
    }
})

//VIEW RENDERING STUFF/IMAGE SELECTING STUFF
//renders a view of only selected images
$('#viewSelected').click(function(){
    $('.instafeedPhoto img').each(function(index, element){
        if(!$(element).hasClass('selected')){
            $(element).closest('.instafeedPhoto').remove()
        }
    })
})
//clears selected images from the dom
$('#clearImages').click(function(){
    $('#instafeed').empty()
    selectedPhotos = {'photos' : []}
})

// saves the selected images to the DB
$('#saveSelected').click(function(){
    if($('#nameInput').val() !== ''){
        var name = $('#nameInput').val()
        myDataRef.child(name).set(selectedPhotos)
        $('#instafeed').html(selectedPhotos.photos)
        $('.instafeedPhoto img').each(function(index, value){
            $(value).addClass('selected')
        })
        alert('Images saved successfully!')
    } else{
        window.alert('Please enter the slug you wish to associate this feed with')
    }
})
//selects or deslects 
$(document).on('click', '.instafeedPhoto', function(event){
    event.preventDefault()
    var $this = $(this)
    var $img = $this.find('img')
    if($img.hasClass('selected')){
        var deleteIndex
        for(var i = 0; i <selectedPhotos.photos.length; i++){
            if(selectedPhotos.photos[i].indexOf($(this).find('a').attr('href')) > -1){
                deleteIndex = i
            }
        }
        selectedPhotos.photos.splice(deleteIndex, 1)
        $img.removeClass('selected')
    } else{
        selectedPhotos.photos.push($this[0].outerHTML)
        $img.addClass('selected')
    }
    updateNotifyButton()

})
//notifies me to update
$('#submitSelected').click(function(){
    if($('#nameInput').val() !== ''){
        var params = "payload="+encodeURIComponent(JSON.stringify({
          text: 'Images Updated for ' + $('#nameInput').val(),
          username: 'BellroyInstagramBot',
          icon_emoji: ":bear:",
        }))

        var slackPost = new XMLHttpRequest()
        slackPost.open("POST", 'https://hooks.slack.com/services/' + slackHookKey)
        slackPost.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")
        slackPost.send(params)
        slackPost.onreadystatechange = function(){
            if(slackPost.status === 200 && !alerted){
                alerted = true
                selectedPhotos = {'photos' : []}
                $('#instafeed').empty()
                $('#submitWrapper').addClass('ishidden')
                $('#submitWrapper').animate({
                    'margin-right': '-200px'
                }, 300)
                alert('Sam successfully notified')
            }
        }
    } else{
        window.alert('Please enter the slug you wish to associate this feed with')
    }
})
//Renders saved feeds
$(document).on('click', '.link', function(){
    $('#instafeed').empty()
    $('#instafeed').html(currentDB[$(this).text()].photos)
    var temp = currentDB[$(this).text()].photos
    selectedPhotos.photos = temp
    updateNotifyButton()
    $('.instafeedPhoto img').each(function(index, value){
        $(value).addClass('selected')
    })
    $('#nameInput').val($(this).text())
})

//UTILITY FUNCTIONS
function updateSavedImages(){
    $('#instafeed').empty()
    var myHTML = ''
    for(var k in currentDB){
        if(k !== 'instagramAPIKey' && k !== 'clientID' && k !== 'slackHookKey'){
            myHTML += '<button class="link">' + k + '</button>'
        }
    }
    $('#savedCollectionsWrapper').html(myHTML)
    $('#savedCollectionsWrapper').show()
}
function updateNotifyButton(){
    if(selectedPhotos.photos.length > 0 && $('#submitWrapper').hasClass('ishidden')){
        $('#submitWrapper').removeClass('ishidden')
        $('#submitWrapper').animate({
            'margin-right': '0'
        }, 300)
    } else if(selectedPhotos.photos.length === 0 && !($('#submitWrapper').hasClass('ishidden'))){
        $('#submitWrapper').addClass('ishidden')
        $('#submitWrapper').animate({
            'margin-right': '-200px'
        }, 300)
    }
}