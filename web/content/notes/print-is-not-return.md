---
title: print 不是 return：没写 return，函数交回的就是 None
date: 2026-10-11
tags: [Python]
summary: print 只往屏幕上写；没写 return，函数交回的就是 None
draft: false
---

## 一句话结论：

没写 `return` 时，函数默认交回 `None`；而 `print` 只负责往屏幕上写字，跟函数交回什么结果完全无关。

## 我遇到的问题

我写了一个函数，里面用 `print` 打印了计算结果。我觉得大功告成，于是把这个函数的调用赋值给了一个变量，结果打印这个变量时，屏幕上却出现了一个 `None`。

我当时懵了：明明计算了，也打印了，为什么变量拿不到值？

## 我以为对的 / 原来的做法

我以前觉得：只要屏幕上打印出来了结果，函数就算完成了任务，这个结果就能被赋值给变量。

我甚至以为 `None` 是 `print` 造成的——打印了那么多东西，怎么会什么都没留下？

我一直以为“print 了就等于交回了”，把显示结果和函数返回值混为一谈。

**其实是**：`print` 只管往屏幕上写，它不决定函数交回什么；交回什么，只由 `return` 决定。

## 现在怎么做

理解这一点，用三块来拆解：

**1. 奶茶店类比**：`print` 就像店员大声喊“您的奶茶好了”（屏幕有显示），但没把奶茶递到我手里（没交回值）；`return` 才是真正把奶茶递到我手里。

现象：屏幕上明明出现了 `order 32 is ready`，可 `a` 依然是 `None`；而 `b` 拿到的是真正的字符串。

```python
def shout():
    print("order 32 is ready")   # 只喊，不递东西

def hand_over():
    return "milk tea"            # 真把东西递出来

a = shout()
print("a =", a)

b = hand_over()
print("b =", b)
```

```
order 32 is ready
a = None
b = milk tea
```

**2. 默认返回值**：如果函数里没写 `return`，或者只写了 `return` 后面空着，Python 默认交回 `None`。

现象：我写了一个 `return` 后面什么都没跟的函数，打印它的结果，屏幕上就是 `None`。

```python
def empty_return():
    return

print(empty_return())
```

```
None
```

**3. 算了但没交回**：比如一个 `add` 函数，算了结果却只 `print`，调用时结果就被丢掉了。

现象：`add(1, 2)` 屏幕上打印了 `3`，但 `result` 里存到的还是 `None`。

```python
def add(a, b):
    print(a + b)  # 只喊话，没递东西

result = add(1, 2)
print(result)  # 输出 None，因为没写 return
```

```
3
None
```

## 代价与边界

这个坑很疼：拿着 `None` 去继续算会直接报错。不过报错分两种：对它**调方法**是 `AttributeError: 'NoneType' object has no attribute 'upper'`；**做加减**这类运算是 `TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'`。

我要记住的是，“屏幕上有输出”绝不等于“手里拿到了值”。

更麻烦的是，没写 `return` 不是语法错误，Python 不会报错，所以没有任何提示会提醒我，只能自己排查。

## 一句话总结

屏幕上的东西（print）和手里的东西（return）是两条线。