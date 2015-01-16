var gulp         = require('gulp'),
	ngAnnotate   = require('gulp-ng-annotate'),
	rename       = require('gulp-rename'),
	uglify       = require('gulp-uglify');

gulp.task('default', function(){
	gulp.watch('angularfire-helper.js', function(){
		gulp.src('angularfire-helper.js')
			.pipe(ngAnnotate())
			.pipe(rename({suffix: '.min'}))
			.pipe(uglify())
			.pipe(gulp.dest('./'));
	});
});