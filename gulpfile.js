var gulp         = require('gulp'),
	ngAnnotate   = require('gulp-ng-annotate'),
	rename       = require('gulp-rename'),
	uglify       = require('gulp-uglify'),
	gutil        = require('gulp-util'),
	browserSync  = require('browser-sync');

gulp
	// compile
	.task('build', function(){
		gulp.src('angularfire-helper.js')
			.pipe(ngAnnotate())
			.pipe(rename({suffix: '.min'}))
			.pipe(uglify())
			.pipe(gulp.dest('./'));
	})
	.task('watch', function(){
		gulp.watch('angularfire-helper.js', ['build']);
	})
	
	
	// live-updating for testing
	.task('dev', ['watch'], function(){
		browserSync.init({
			files: ['*'],
			server: {baseDir: './'},
			watchOptions: {debounce: 400},
			ghostMode: false,
			notify: false,
			open: !! gutil.env.open, // call `gulp --open` to start gulp and also open a new browser window
		});
	})

	// default
	.task('default', ['dev']);