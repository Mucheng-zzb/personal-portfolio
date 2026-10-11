---
title: 函数定义只是"说明书"，不会自己执行，必须要调用
date: 2026-10-11
tags: [Python]
summary: def 只是给函数登记了身份，所以加 () 才能真正执行，不加 return 也只会拿到 None。
draft: false
---

一句话结论：def 只是登记信息，加个 () 才会执行；如果只干活不汇报，默认返回 None。

## 我遇到的问题

刚开始学习 Python 的时候，我写了个函数，运行整个程序时，屏幕却没反应。有时又会突然蹦出一个 None，让我真的是一脸懵。

## 我以为对的 / 原来的做法

我以为写了 def greet():，程序跑到这里就会自动执行打印。

我以为 greet 和 greet() 是一回事，写哪个都可以。

我以为在同一个文件里写两个同名的 def，Python 会报错。结果是用最后一个覆盖了前面的，导致改了半天代码却不生效。

## 现在怎么做

**1. def 只是登记（相当于把工具放进了工具箱），必须加 () 才是真正调用。**

我先写了 `def greet():`，然后在下面写了一行 `greet`，运行时屏幕上是空的；把那一行改成 `greet()` 之后，才打印出 `Hello_World`。

```python
def greet():
    print("Hello_World")

print("--- 还没调用 greet ---")
greet                 # 没加括号：屏幕上什么都不会出现
print("--- 写了 greet() 之后 ---")
greet()               # 加了括号：这里才打印 Hello_World
```

**2. print 只是展示，如果没写 return，它默认交回 None。**

`get_greet()` 明明打印了 `Hello_World`，但我写 `result = get_greet()` 再 `print(result)`，屏幕上先出现 `Hello_World`、紧接着出现 `None`——两行输出，说明"打印出来"和"交回来"是两件事。

```python
def get_greet():
    print("Hello_World")   # 只打印，没有 return

result = get_greet()
print(result)              # 打印出 None
```

**3. Python 中重复定义同名函数不会报错，后面的会覆盖前面的。**

我在同一个文件里写了两个同名函数，第一个打印 `Hello_World`、第二个打印 `Hello_Again`，Python 一句提示都没有；调用时跑的是第二个。

```python
def greet():
    print("Hello_World")

def greet():
    print("Hi")

greet()   # 没有报错，打印的是 Hi
```

## 代价与边界

最常见的是忘了写括号，特别是把函数当参数传递时。其次是改了函数没生效，排查半天，其实是被后面的同名定义覆盖了。最后是 print 和 return 混用，导致拿到 None。

最致命的是忘了写括号，它让你误以为程序坏了。

## 一句话总结

看到 None，先回去看看函数里有没有写 return；函数不跑，先找找是不是只定义了没有加 ()。