## Binary Addition

### Case Study

> _"Make me a JS function to add two binary numbers without using built-in functions or libraries."_

Before we jump into the code, let’s make sure we understand how binary addition works. Here’s the basic rule:

> **_Binary consists only of 0s and 1s_**

You’ll notice that while adding binary numbers, the sum at any step can go up to "3". Let’s take an example:

> **11 + 11**

### How to Do It

> Start with the last index of both binary numbers.

In this case, the first binary digit is **1**, and the second binary digit is also **1**. Add them up: **1 + 1 = 2**.

Since **binary numbers** only consist of **0s and 1s**, **2** is not a valid digit. So, we need a system to manage this.

Here’s the trick: we’ll use a **carry** to handle the overflow. If the sum is greater than 1, the carry will be **1**. Otherwise, it’ll be **0**.

```js
carry = 1;
currentResult = 0;

// So after this iteration, the result is: 0
```

### Moving to the Next Step

> Add the next digits, including the carry.

Again, we’re adding **1 + 1**. But this time, we also add the carry from the previous step, making it **1 + 1 + 1 = 3**.

The maximum value here can only be **3**, so we’ll apply the same logic:

- Set the carry with `carry = sum > 1 ? 1 : 0`.
- Use the mod operator to get the correct result: `sum % 2`.

```js
carry = 1;
currentResult = 1;
```

Now, append the current result to the final output:

```js
carry = 1;
currentResult = 1;

// The result so far will be: 10
```

### Checking for Remaining Carry

> If there’s still a carry left after finishing the iteration, append it to the result.

Since our last step gave us a carry of **1**, we add that to the result:

```js
// The result after appending the carry will be: 110
```

### Final Result

So, the binary addition of **11 + 11** gives us `110`.

### The Complete Code

Here’s the working JavaScript function for adding binary numbers without using built-in functions:

```js
const withExplanation = false;

function addBinary(bin1, bin2) {
  let result = "";
  let carry = 0;
  let i = bin1.length - 1;
  let j = bin2.length - 1;
  
  if (withExplanation) console.log({ bin1, bin2 }, "\n");

  let step = 1;

  while (i >= 0 || j >= 0 || carry) {
    let sum = carry;

    if (withExplanation) {
      console.log("Step:\t\t", step);
      console.log("Carryover:\t", sum);
    }

    if (i >= 0) {
      if (withExplanation) {
        console.log(`Add index ${i} of ${bin1} (which is ${bin1[i]})`);
      }
      sum += Number(bin1[i]);
    }

    if (j >= 0) {
      if (withExplanation) {
        console.log(`Add index ${j} of ${bin2} (which is ${bin2[j]})`);
      }
      sum += Number(bin2[j]);
    }

    if (withExplanation) console.log("Sum result:\t", sum);

    carry = sum > 1 ? 1 : 0;

    if (carry && withExplanation) {
      console.log(`Carryover needed, new carry: ${carry}`);
    }

    result = String(sum % 2) + result;

    if (withExplanation) console.log("Result so far:\t", result, "\n");

    step++;
    i--;
    j--;
  }

  console.log(
    `The result of ${bin1} (${parseInt(bin1, 2)} in decimal) + ${bin2} (${parseInt(bin2, 2)} in decimal) is ${result} (${parseInt(result, 2)} in decimal)`
  );

  // Return result if needed
  // return result;
}

// Example inputs
const input1 = "101011";
const input2 = "11111";
addBinary(input1, input2);
```

### Conclusion

In this blog, we’ve broken down how to add binary numbers manually by handling carryovers and restricting the result to binary digits. With this approach, you can add binary numbers without relying on built-in functions. Just remember the key rules:
- **Carry over if the sum exceeds 1.**
- **Use mod to keep the result within 0 or 1.**

That’s it! You now have a basic understanding of how to perform binary addition.