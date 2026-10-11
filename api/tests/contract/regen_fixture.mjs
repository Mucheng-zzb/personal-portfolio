// 重生成契约 fixture 的**唯一指定做法**（在仓库根执行）：
//
//   node api/tests/contract/regen_fixture.mjs
//
// 为什么不能直接 `node make_fixture.mjs > api/tests/contract/fixture_js.json`：
// Windows PowerShell 的 `>` 重定向**不是**写出原始字节，而是把管道里的文本
// 按它自己的编码规则重写一遍 —— 结果是 UTF-16（带 BOM）的文件。
// 随后 pytest 读它就会报 UnicodeDecodeError，而报错信息看起来像是 fixture 内容坏了，
// 不像是「你换了个 shell 写法」。这个坑在本项目已经踩过两次（第二次还发生在
// 写下这条教训之后），所以把「跑并落盘」这件事整个搬进 Node：进程内拿到 stdout、
// 用 writeFileSync 明确写 UTF-8，不再经过任何 shell。
//
// 什么要重跑：改了 web/content/**，或改了 web/build/content-schema.js 的字段表 / 排序规则。
// 跑完用 `git diff --stat` 自查：内容没变时它应该是幂等的（fixture 逐字节不变）。

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const out = execFileSync(process.execPath, ['api/tests/contract/make_fixture.mjs'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

writeFileSync('api/tests/contract/fixture_js.json', out, 'utf8');
