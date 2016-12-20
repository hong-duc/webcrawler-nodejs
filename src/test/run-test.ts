import { TestSet, TestRunner } from 'alsatian';
import { TapBark } from 'tap-bark';

const testSet = TestSet.create();

testSet.addTestsFromFiles("dist/test/crawl-test/*.spec.js");

const testRunner = new TestRunner();

testRunner.outputStream
    .pipe(TapBark.create().getPipeable())
    .pipe(process.stdout)

testRunner.run(testSet)
    .then((results) => {
        console.log('done');
        // console.log(JSON.stringify(results))
    })
    .catch(error => {
        console.error('Error: ', error);
    });