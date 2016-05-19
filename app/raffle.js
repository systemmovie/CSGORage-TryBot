var socket = io.connect("http://localhost:3331");

var cloudflare = document.querySelector("#cf_alert_div");
var csgorage = document.querySelector(".col-lg-12.title");


if (!!cloudflare) {
    socket.emit('csgorage-trybot cloudflare alwaysonline', {}); // retry in a few minutes

} else if(!!csgorage) {
    var login = document.querySelector('.black_background .container .login a');

    if (!!login) {
        // not connected
        socket.emit('csgorage-trybot not connected', {});
        login.click();
    } else {
        var nick_name = document.querySelector('.profile .nickname').innerText;

        socket.emit('csgorage-trybot connected', {steam_nick_name: nick_name});

        // if we are on the list of free raflles pages 
        if(location.href == "http://csgorage.com/free-raffles/current") {
            // get all the free raffles
            var links = document.querySelectorAll('.row .raffle_box_lg a');

            var link;
            var links_length = links.length;
            var ribbon;

            for(var i = 0; i < links_length; i++) {
                link = links[i];

                // check if we have the ribbon that we are in
                ribbon = link.querySelector('.ribbon-blue-mms');

                if (!ribbon) {
                    // if we dont have the ribbon we change the page url 
                    // to the raffle url
                    var href = links[i].getAttribute('href');
                    location.href = href;
                    break; // just in case...
                }
            }

            setTimeout(function() {
                socket.emit('csgorage-trybot done checking', {});
            }, 100);

        } else {
            // if we are not on the free raffle page list we must be on the raffle page per si.
            var raffle_name = document.querySelector('p.gun').textContent.trim();

            //override the alert function
            function alert(message) {
                var result = message;
                if (result == "Success!") {
                    socket.emit('csgorage-trybot sucess enter raffle', {name: raffle_name});
                }
            }

            var randomize_btn = document.querySelector("#randomize");
            
            if (randomize_btn) {
                randomize_btn.click();
                setTimeout(function() {
                    document.querySelector("#getrandomslot").click();
                }, 1000);
            } else {
                // if we dont find a randomize button we must be already on the raffle
                // so we just go back to the raffle list
                location.href = "http://csgorage.com/free-raffles/current"; 
            }
        } // if location.href free-raffles/current
    } // if login

} else {
    var cloudflare_captcha = document.querySelector("#cf-error-details");

    if (!!cloudflare_captcha) {
        socket.emit('csgorage-trybot cloudflare captcha', {});
    } else {
        socket.emit('csgorage-trybot page error', {});
    }
}





























function main () {
	var login = document.querySelector('.black_background .container .login a');

	if (!login) {
    var nickname = document.querySelector('.black_background .container .logged_in .nickname');


    socket.emit('raffles', {
      nickname: nickname.textContent.trim(),
      raffles: listRaffles()
    });

		return;
	}

	var e = document.createEvent('MouseEvents');
	e.initEvent('click', true, true);
	login.dispatchEvent(e);
}

function listRaffles () {
  var raffles = [];
  var links = document.querySelectorAll('.row .raffle_box_lg a');

  var link, i, l = links.length, ribbon, progress;

  for (i = 0; i < l; ++i) {
    link = links[i];

    ribbon = link.querySelector('.ribbon-blue-mms');
    progress = link.querySelector('.barra > span').textContent;

    var matches = progress.match(/([0-9]*)\/ ([0-9]*)$/);

    var href = links[i].getAttribute('href');
    var href_matches = href.match(/([0-9]*)$/)
    var id = parseInt(href_matches[1]);

    raffles.push({
      raffle: id,
      label: link.querySelector('p.gun').textContent.trim(),
      href: href,
      ribbon: !!ribbon,
      progressValue: parseInt(matches[1]),
      progressMax: parseInt(matches[2])
    });
  }
  return raffles;
}

main();
