import { Gulpclass, Task, SequenceTask } from 'gulpclass/Decorators';
import gulp = require('gulp');
import gts = require('gulp-typescript');


/**
 * lớp là lớp chính để chạy gulp
 * muốn thêm task thì thêm vào trong đây
 * 
 * luật chung khi tạo 1 task:
 * - task phải trả về stream
 * - nếu không trả về stream được thì phải nhận vào 1 callback function
 *   và gọi nó khi muốn báo là task đã dừng
 * 
 * vì nếu không trả về hoặc báo là dừng thì task đó sẽ không bao giờ dừng
 * 
 * đọc ở đây để biết thêm:
 * https://github.com/gulpjs/gulp/blob/master/docs/API.md
 */
@Gulpclass()
export class Gulpfile {

    // tạo biến project của gulp-typescript
    tsProject: gts.Project = gts.createProject('./tsconfig.json');
    // thư mục sẽ chứa các file js đã được compile
    jsDest: string = 'dist';
    filesToMove: string[] = [
        "./src/config.json"
    ];

    /**
     * task này sẽ compile các file
     * được khai báo trong phần files của tsconfig
     * và đưa vào thư mục dist/app
     */
    @Task('',['move'])
    compile() {
        let tsResult = this.tsProject.src().pipe(this.tsProject(gts.reporter.longReporter()));
        return tsResult.js.pipe(gulp.dest(this.jsDest));
    }

    @Task()
    move(){
        return gulp.src(this.filesToMove,{base: './src'}).pipe(gulp.dest(this.jsDest));
    }
  
    /**
     * task này là default khi chỉ chạy gulp trong command line
     * nó sẽ chạy lần lượt các task compile,nodemon,watch
     */
    @SequenceTask()
    default() {
        return ['compile'];
    }
} 
