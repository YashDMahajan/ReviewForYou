const express = require("express");
const { appendFile } = require("fs");
const http = require("https");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const possportLocalMongoose = require("passport-local-mongoose");
const { findSourceMap } = require("module");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: "Our Little Secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());       //start using passport
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/reviewForYou");


const userSchema = new mongoose.Schema ({
	email: String,
	uname:String,
    password: String
});

userSchema.plugin(possportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const reviewSchema = {
	id: String,
	uname: String,
	company: String,
	review: String
}

const Review = mongoose.model("Review", reviewSchema);

let userAmazon = [];
let userWalmart = [];

app.get("/", function(req, res){
    res.render("home");  
});

app.get("/review", function(req, res){
	res.render("review", {reviewes: userAmazon, walmartarray: userWalmart});
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/signup", function(req, res){
	res.render("signup");
});

app.get("/add_reviews", function(req, res){
	if(req.isAuthenticated()){
        res.render("add_reviews");
    }
    else{
        res.redirect("/login");
	}	
});

app.get("/logout", function(req, res){
	req.logout(function(err){       // req.logout method comes from passport.
        if(err){
            console.log(err);
        }
        else{
            res.redirect("/");
        }
    }); 
});

app.get("/profile", function(req, res){
	if(req.isAuthenticated()){

		User.findById(req.user.id, function(err, foundPerson){
			if(err){
				console.log(err);
			}
			else{
				if(foundPerson){
					Review.find({"id": req.user.id}, function(err, foundUser){
						if(err){
							console.log(err);
						}
						else{
							if(foundUser){
								res.render("profile", {ureviews: foundUser, uname: foundPerson.uname});
							}
						}
					});
				}
			}
		});



		// Review.find({"id": req.user.id}, function(err, foundUser){
		// 	if(err){
		// 		console.log(err);
		// 	}
		// 	else{
		// 		if(foundUser){
		// 			res.render("profile", {ureviews: foundUser});
		// 		}
		// 	}
		// });
	}
	else{
		res.redirect("/login");
	}
});

app.get("/your_reviews", function(req, res){
	Review.find({}, function(err, foundReviews){
		if(err){
			console.log(err);
		}
		else{
			res.render("your_reviews", {reviews: foundReviews});
		}
	});
});

app.post("/amazon", function(request, response){
	//----------------------------------Amazon--------------------------------- 
	userAmazon.splice(0, userAmazon.length);
	const codes = request.body.code;
	const options = {
		"method": "GET",
		"hostname": "amazon24.p.rapidapi.com",
		"port": null,
		"path": "/api/review/" +codes+ "?page=1&country=IN",
		"headers": {
			"X-RapidAPI-Key": "c322093fc8msh423314ad27dd7e6p1b3187jsnf7dfacbdce15",
			"X-RapidAPI-Host": "amazon24.p.rapidapi.com",
			"useQueryString": true
		}
	};
	
	const req = http.request(options, function (res) {
		const chunks = [];
	
		res.on("data", function (chunk) {
			chunks.push(chunk);
		});
	
		res.on("end", function () {
			const body = Buffer.concat(chunks);
			//console.log(body.toString());
			const reviewData = JSON.parse(body);
			console.log("_________________________________________-----______________");
			console.log("Amazon");
			console.log("______________________________-----_________________________");
			// for(let i=0 ; i<10; i++){
			// 	console.log("Name : "+reviewData.docs[i].customerName);
			// 	console.log("Review : "+reviewData.docs[i].text);
			// 	console.log("--------------------------------------------------------");
			// 	console.log("--------------------------------------------------------");
			// }

			for(let i=0; i<10; i++){

				const reviews = {
					name : reviewData.docs[i].customerName,
					rating: reviewData.overview.rating,
					review : reviewData.docs[i].text 
				};
				userAmazon.push(reviews);

				// const name = reviewData.docs[i].customerName;
				// const review = reviewData.docs[i].text;
			}

			response.redirect("/review");
		});
	});

	req.end();

});

app.post("/walmart", function(request, response){
	// ----------------------------------WalMart-------------------------------- 
	userWalmart.splice(0, userWalmart.length);
	const codeWalmart = request.body.code;

	const options1 = {
	"method": "GET",
	"hostname": "walmart.p.rapidapi.com",
	"port": null,
	"path": "/reviews/v2/list?usItemId="+codeWalmart+"&limit=20&page=1&sort=relevancy",
	"headers": {
		"X-RapidAPI-Key": "c322093fc8msh423314ad27dd7e6p1b3187jsnf7dfacbdce15",
		"X-RapidAPI-Host": "walmart.p.rapidapi.com",
		"useQueryString": true
	}
};

const reqe = http.request(options1, function (rese) {
	const chunkss = [];

	rese.on("data", function (chunkk) {
		chunkss.push(chunkk);
	});

	rese.on("end", function () {
		const body = Buffer.concat(chunkss);
		//console.log(body.toString());
        const dataOfWalmart = JSON.parse(body);
        console.log("_________________________________________-----______________");
        console.log("WalMart");
        console.log("______________________________-----_________________________");
        // for(let i=0; i<10; i++){
        //     console.log(dataOfWalmart.data.reviews.customerReviews[i].userNickname);
        //     console.log(dataOfWalmart.data.reviews.customerReviews[i].reviewText);
        //     console.log("_________________---------_____________________");
        // }

		for(let i=0; i<10; i++){

			const reviews = {
				name : dataOfWalmart.data.reviews.customerReviews[i].userNickname,
				review : dataOfWalmart.data.reviews.customerReviews[i].reviewText 
			};
			userWalmart.push(reviews);

			// const name = reviewData.docs[i].customerName;
			// const review = reviewData.docs[i].text;
		}

		response.redirect("/review");
	});
});

reqe.end();
});

app.post("/signup", function(req, res){
	User.register({username: req.body.username, uname: req.body.name}, req.body.password, function(err, user){          //User.register method comes from passport.
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/");
            });
        }
    });
});

app.post("/add_reviews", function(req, res){
	//console.log(req.user.uname);
	const id = req.user.id;
	const uname = req.user.uname;
	const company = req.body.company;
	const experience = req.body.experience;

	const review = new Review({
		id: id,
		uname: uname,
		company: company,
		review: experience
	});

	review.save();
	res.redirect("/your_reviews");
});

app.post("/login", function(req, res){
	const user = new User({
        username: req.body.username,
        password: req.body.password
    });

	req.login(user, function(err){          //req.login comes from passport.
		if(err){
			console.log(err);
		}
		else{
		   passport.authenticate("local")(req, res, function(){
			   res.redirect("/");
		   });
		}
   }); 
});

app.post("/delete", function(req, res){
	//console.log(req.body.checkbox);
	Review.findByIdAndRemove(req.body.checkbox, function(err){
		if(!err){
			//console.log("Successfully deleted");
			res.redirect("profile");
		}
	});
});

app.listen(3000, function(){
	console.log("Server is running on port 3000");
});	



// const options = {
// 	"method": "GET",
// 	"hostname": "amazon24.p.rapidapi.com",
// 	"port": null,
// 	"path": "/api/review/B09QT9Q2JM?page=1&country=IN",
// 	"headers": {
// 		"X-RapidAPI-Key": "c322093fc8msh423314ad27dd7e6p1b3187jsnf7dfacbdce15",
// 		"X-RapidAPI-Host": "amazon24.p.rapidapi.com",
// 		"useQueryString": true
// 	}
// };

// const req = http.request(options, function (res) {
// 	const chunks = [];

// 	res.on("data", function (chunk) {
// 		chunks.push(chunk);
// 	});

// 	res.on("end", function () {
// 		const body = Buffer.concat(chunks);
// 		//console.log(body.toString());
//         const reviewData = JSON.parse(body);
//         console.log("_________________________________________-----______________");
//         console.log("Amazon");
//         console.log("______________________________-----_________________________");
//         for(let i=0 ; i<10; i++){
//             console.log("Name : "+reviewData.docs[i].customerName);
//             console.log("Review : "+reviewData.docs[i].text);
//             console.log("--------------------------------------------------------");
//             console.log("--------------------------------------------------------");
//         }
        
// 	});
// });

// req.end();

// const options1 = {
// 	"method": "GET",
// 	"hostname": "walmart.p.rapidapi.com",
// 	"port": null,
// 	"path": "/reviews/v2/list?usItemId=335465071&limit=20&page=1&sort=relevancy",
// 	"headers": {
// 		"X-RapidAPI-Key": "c322093fc8msh423314ad27dd7e6p1b3187jsnf7dfacbdce15",
// 		"X-RapidAPI-Host": "walmart.p.rapidapi.com",
// 		"useQueryString": true
// 	}
// };

// const reqe = http.request(options1, function (rese) {
// 	const chunkss = [];

// 	rese.on("data", function (chunkk) {
// 		chunkss.push(chunkk);
// 	});

// 	rese.on("end", function () {
// 		const body = Buffer.concat(chunkss);
// 		//console.log(body.toString());
//         const dataOfWalmart = JSON.parse(body);
//         console.log("_________________________________________-----______________");
//         console.log("WalMart");
//         console.log("______________________________-----_________________________");
//         for(let i=0; i<10; i++){
//             console.log(dataOfWalmart.data.reviews.customerReviews[i].userNickname);
//             console.log(dataOfWalmart.data.reviews.customerReviews[i].reviewText);
//             console.log("_________________---------_____________________");
//         }
// 	});
// });

// reqe.end();


