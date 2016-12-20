import { TestSet, TestRunner } from 'alsatian';
import * as tapSpec from 'tap-spec';

const testSet = TestSet.create();

testSet.addTestsFromFiles("dist/test/crawl-test/*.spec.js");

const testRunner = new TestRunner();

testRunner.outputStream
    .pipe(tapSpec())
    .pipe(process.stdout)

testRunner.run(testSet)
    .then((results) => {
        console.log('done');
        // console.log(JSON.stringify(results))
    })
    .catch(error => {
        console.error('Error: ', error);
    });