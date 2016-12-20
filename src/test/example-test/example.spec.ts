import { Expect, Test } from 'alsatian';

export class TestExample {
    @Test('kiem tra 1 + 1 = 2')
    public test1() {
        Expect(1 + 1).toEqual(2);
    }
}