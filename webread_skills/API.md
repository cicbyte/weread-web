# WeRead Skills — API 接口文档

> 版本：1.0.3 | 统一网关：`POST https://i.weread.qq.com/api/agent/gateway`

---

## 目录

- [1. 全局规范](#1-全局规范)
  - [1.1 鉴权](#11-鉴权)
  - [1.2 请求格式](#12-请求格式)
  - [1.3 响应格式](#13-响应格式)
  - [1.4 通用规则](#14-通用规则)
  - [1.5 数据展示规范](#15-数据展示规范)
  - [1.6 深度链接 (URL Schema)](#16-深度链接-url-schema)
- [2. 搜索 — `/store/search`](#2-搜索--storesearch)
- [3. 书籍信息](#3-书籍信息)
  - [3.1 书籍详情 — `/book/info`](#31-书籍详情--bookinfo)
  - [3.2 章节目录 — `/book/chapterinfo`](#32-章节目录--bookchapterinfo)
  - [3.3 阅读进度 — `/book/getprogress`](#33-阅读进度--bookgetprogress)
- [4. 书架管理 — `/shelf/sync`](#4-书架管理--shelfsync)
- [5. 阅读统计 — `/readdata/detail`](#5-阅读统计--readdatadetail)
- [6. 笔记与划线](#6-笔记与划线)
  - [6.1 笔记本概览 — `/user/notebooks`](#61-笔记本概览--usernotebooks)
  - [6.2 单本书划线 — `/book/bookmarklist`](#62-单本书划线--bookbookmarklist)
  - [6.3 个人想法/点评 — `/review/list/mine`](#63-个人想法点评--reviewlistmine)
  - [6.4 章节划线热度 — `/book/underlines`](#64-章节划线热度--bookunderlines)
  - [6.5 热门划线 — `/book/bestbookmarks`](#65-热门划线--bookbestbookmarks)
  - [6.6 划线下想法 — `/book/readreviews`](#66-划线下想法--bookreadreviews)
  - [6.7 单条想法详情 — `/review/single`](#67-单条想法详情--reviewsingle)
- [7. 书籍点评 — `/review/list`](#7-书籍点评--reviewlist)
- [8. 发现推荐](#8-发现推荐)
  - [8.1 个性化推荐 — `/book/recommend`](#81-个性化推荐--bookrecommend)
  - [8.2 相似书推荐 — `/book/similar`](#82-相似书推荐--booksimilar)
- [9. 用户概况 — `/profile`](#9-用户概况--profile)
- [10. 接口索引](#10-接口索引)

---

## 1. 全局规范

### 1.1 鉴权

| 项目 | 说明 |
|------|------|
| 方式 | Bearer Token |
| Header | `Authorization: Bearer $WEREAD_API_KEY` |
| Token 格式 | `wrk-xxxxxxxx` |
| 获取方式 | 环境变量 `WEREAD_API_KEY` |
| 身份绑定 | API Key 绑定用户 vid，需身份的接口自动注入 |

### 1.2 请求格式

```
POST https://i.weread.qq.com/api/agent/gateway
Content-Type: application/json
Authorization: Bearer <WEREAD_API_KEY>
```

**请求体结构（业务参数平铺在顶层）：**

```json
{
  "api_name": "<接口路径>",
  "skill_version": "1.0.3",
  "<参数1>": "<值1>",
  "<参数2>": "<值2>"
}
```

> **禁止**将业务参数包裹在 `params`、`data`、`body` 等嵌套对象中。

**正确示例：**
```json
{"api_name": "/store/search", "keyword": "三体", "count": 10, "skill_version": "1.0.3"}
```

**错误示例：**
```json
{"api_name": "/store/search", "params": {"keyword": "三体"}, "skill_version": "1.0.3"}
```

### 1.3 响应格式

- 返回 JSON，字段经过裁剪，仅保留核心字段
- `errcode` 非 0 表示错误
- 可通过发送 `{"api_name": "/_list"}` 查看所有可用接口及参数定义
- **版本升级**：若回包中出现 `upgrade_info` 字段，必须立即按其 `message` 完成升级

### 1.4 通用规则

| # | 规则 | 说明 |
|---|------|------|
| 1 | `skill_version` 必传 | 每次请求必须包含 `"skill_version": "1.0.3"` |
| 2 | 参数平铺 | 业务参数与 `api_name` 同级，不嵌套 |
| 3 | bookId 解析 | 用户输入书名时，先调 `/store/search` 获取 bookId |
| 4 | 上下文衔接 | 对话中记住已查询的 bookId，避免重复获取 |
| 5 | 深度链接 | 展示内容时拼接跳转链接（见 [1.6 节](#16-深度链接-url-schema)） |

### 1.5 数据展示规范

| 数据类型 | 原始格式 | 展示格式 |
|----------|----------|----------|
| Unix 时间戳 | `1748563200` | `2025-05-30`（YYYY-MM-DD） |
| 阅读时长 | 秒（`3600`） | `1小时0分钟` |
| 阅读进度 | 整数 `0-100` | `45%`（必须带 % 号） |
| 价格 | 分（`2990`） | `29.90元` |
| 评分 | 百分制 `0-100` | `85分` 或 `8.5/10` |

### 1.6 深度链接 (URL Schema)

#### 打开书籍

```
weread://reading?bId={bookId}
```

#### 跳转到指定章节

```
weread://reading?bId={bookId}&chapterUid={chapterUid}
```

#### 跳转到划线/想法位置

```
weread://bestbookmark?bookId={bookId}&chapterUid={chapterUid}&rangeStart={rangeStart}&rangeEnd={rangeEnd}&userVid={userVid}
```

> `range` 格式为 `"起始-结束"`（如 `"900-2004"`），拆分后填入 `rangeStart` 和 `rangeEnd`。

---

## 2. 搜索 — `/store/search`

在书城中搜索书籍、作者、文章等内容。

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | 是 | 搜索关键词 |
| `scope` | int | 否 | 搜索类型（默认 `10`），见下表 |
| `maxIdx` | int | 否 | 翻页偏移，默认 `0` |
| `count` | int | 否 | 每页数量，默认 `15` |

### scope 取值

| scope | 名称 | 说明 |
|-------|------|------|
| `0` | 全部 | 综合搜索，results 含多个分组 |
| `10` | 电子书 | 仅电子书（不含网文） |
| `16` | 网文小说 | 仅网文小说 |
| `14` | 微信听书 | 有声书/专辑/播客 |
| `6` | 作者 | 搜索作者 |
| `12` | 全文 | 搜索书籍正文内容 |
| `13` | 书单 | 搜索书单 |
| `2` | 公众号 | 搜索公众号 |
| `4` | 文章 | 搜索公众号文章 |

### scope 选择指引

| 用户意图 | scope |
|----------|-------|
| 明确"搜书/找书" | `10` |
| 泛搜索"搜一下xx" | `0` |
| "网文/网络小说" | `16`；普通"小说"仍用 `10` |
| "听书/有声书/播客/专辑" | `14` |
| "搜作者" | `6` |
| "书里提到/全文搜索" | `12` |
| "书单" | `13` |
| "搜公众号" | `2` |
| "搜文章" | `4` |

### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `sid` | string | 搜索会话 ID |
| `hasMore` | int | 是否有更多（`1`=有, `0`=无） |
| `results` | array | 搜索结果分组数组 |
| `results[].title` | string | 分组标题（如"电子书""作者"） |
| `results[].scope` | int | 分组类型 |
| `results[].scopeCount` | int | 该分组总结果数 |
| `results[].currentCount` | int | 本次返回数量 |
| `results[].books` | array | 书籍/结果数组 |
| `results[].books[].searchIdx` | int | 搜索序号（用于翻页） |
| `results[].books[].bookInfo.bookId` | string | 书籍 ID |
| `results[].books[].bookInfo.title` | string | 书名 |
| `results[].books[].bookInfo.author` | string | 作者 |
| `results[].books[].bookInfo.cover` | string | 封面图 URL |
| `results[].books[].bookInfo.intro` | string | 简介 |
| `results[].books[].bookInfo.publisher` | string | 出版社 |
| `results[].books[].bookInfo.category` | string | 分类 |
| `results[].books[].bookInfo.payType` | int | 付费类型 |
| `results[].books[].bookInfo.price` | int | 价格（分） |
| `results[].books[].bookInfo.soldout` | int | 是否下架（`1`=下架） |
| `results[].books[].readingCount` | int | 在读人数 |
| `results[].books[].newRating` | int | 评分（0-100） |
| `results[].books[].newRatingCount` | int | 评分人数 |
| `results[].books[].newRatingDetail` | object | 评分标签（如 `{"title":"神作"}`） |

### 翻页方式

`hasMore` 为 `1` 时，用最后一条结果的 `searchIdx` 作为下一页的 `maxIdx`。

### 示例

```json
// 请求
{"api_name": "/store/search", "keyword": "三体", "scope": 10, "count": 5, "skill_version": "1.0.3"}

// 响应
{
  "sid": "xxx",
  "hasMore": 1,
  "results": [{
    "title": "电子书",
    "scope": 10,
    "scopeCount": 15,
    "currentCount": 5,
    "books": [
      {
        "searchIdx": 0,
        "bookInfo": {
          "bookId": "3300045871",
          "title": "三体",
          "author": "刘慈欣",
          "cover": "https://...",
          "newRating": 88
        },
        "readingCount": 125000
      }
    ]
  }]
}
```

---

## 3. 书籍信息

### 3.1 书籍详情 — `/book/info`

获取单本书的详细信息。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍 ID |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `bookId` | string | 书籍 ID |
| `title` | string | 书名 |
| `author` | string | 作者 |
| `translator` | string | 译者 |
| `cover` | string | 封面 URL |
| `intro` | string | 简介 |
| `category` | string | 分类 |
| `publisher` | string | 出版社 |
| `publishTime` | string | 出版时间 |
| `isbn` | string | ISBN |
| `wordCount` | int | 总字数 |
| `newRating` | int | 评分（百分制） |
| `newRatingCount` | int | 评分人数 |
| `newRatingDetail` | object | 评分分布详情 |

#### 示例

```json
{"api_name": "/book/info", "bookId": "3300045871", "skill_version": "1.0.3"}
```

---

### 3.2 章节目录 — `/book/chapterinfo`

获取书籍的完整章节目录。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍 ID |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `bookId` | string | 书籍 ID |
| `synckey` | int | 同步 key（版本号） |
| `chapterUpdateTime` | int | 章节最后更新时间 |
| `chapters` | array | 章节数组 |
| `chapters[].chapterUid` | int | 章节 UID |
| `chapters[].chapterIdx` | int | 章节序号 |
| `chapters[].title` | string | 章节标题 |
| `chapters[].wordCount` | int | 章节字数 |
| `chapters[].level` | int | 目录层级（1=一级, 2=二级...） |
| `chapters[].updateTime` | int | 章节更新时间 |
| `chapters[].price` | int | 章节价格（`0`=免费） |
| `chapters[].paid` | int | 是否已购买（`1`=已购买） |
| `chapters[].isMPChapter` | int | 是否公众号章节（`1`=是） |
| `chapters[].anchors` | array | 章节内锚点/子标题数组 |

---

### 3.3 阅读进度 — `/book/getprogress`

获取用户在某本书的阅读进度。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍 ID |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `bookId` | string | 书籍 ID |
| `book.chapterUid` | int | 当前阅读章节 UID |
| `book.chapterOffset` | int | 当前章节内偏移 |
| `book.progress` | int | 阅读进度百分比（0-100 整数） |
| `book.updateTime` | int | 最后阅读时间（Unix 时间戳） |
| `book.recordReadingTime` | int | 累计阅读时长（秒） |
| `book.finishTime` | int | 读完时间（仅 progress=100 时存在） |
| `book.isStartReading` | int | 是否已开始阅读 |
| `timestamp` | int | 服务端时间戳 |

> **注意**：`progress` 为 0-100 的整数，`1` 表示 1%（刚翻了几页），只有 `100` 才代表读完。

---

## 4. 书架管理 — `/shelf/sync`

获取用户书架的全部内容（电子书 + 有声书 + 文章收藏）。

### 请求参数

无（用户身份通过 API Key 自动识别）。

### 响应字段

#### 电子书 — `books[]`

| 字段 | 类型 | 说明 |
|------|------|------|
| `books[].bookId` | string | 书籍 ID |
| `books[].title` | string | 书名 |
| `books[].author` | string | 作者 |
| `books[].cover` | string | 封面图 URL |
| `books[].category` | string | 分类 |
| `books[].readUpdateTime` | int | 最近阅读时间（Unix 时间戳） |
| `books[].finishReading` | int | 是否读完（`1`=读完） |
| `books[].updateTime` | int | 书籍更新时间 |
| `books[].isTop` | int | 是否置顶 |
| `books[].secret` | int | 是否私密（`1`=私密） |

#### 有声书/专辑 — `albums[]`

| 字段 | 类型 | 说明 |
|------|------|------|
| `albums[].albumInfo.albumId` | string | 专辑 ID |
| `albums[].albumInfo.name` | string | 专辑名称 |
| `albums[].albumInfo.authorName` | string | 演播/作者 |
| `albums[].albumInfo.cover` | string | 封面图 URL |
| `albums[].albumInfo.trackCount` | int | 音频集数 |
| `albums[].albumInfo.finishStatus` | string | 完结状态（如"已完结"） |
| `albums[].albumInfo.finish` | int | 是否完结（`1`=完结） |
| `albums[].albumInfo.payType` | int | 付费类型 |
| `albums[].albumInfo.intro` | string | 专辑简介 |
| `albums[].albumInfo.updateTime` | int | 更新时间（Unix 时间戳） |
| `albums[].albumInfoExtra.secret` | int | 是否私密 |
| `albums[].albumInfoExtra.lecturePaid` | int | 是否已购买 |
| `albums[].albumInfoExtra.lectureReadUpdateTime` | int | 最近收听时间 |
| `albums[].albumInfoExtra.isTop` | int | 是否置顶 |

#### 其他字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `mp` | object | 文章收藏入口；非空表示有 1 个"文章收藏"条目 |
| `archive[].name` | string | 书单名称 |
| `archive[].bookIds` | array | 书单内的 bookId 列表 |
| `bookCount` | int | 电子书数量（= `books.length`） |

### 数量计算规则

| 指标 | 计算方式 |
|------|----------|
| **书架总条目** | `books.length + albums.length + (mp 非空 ? 1 : 0)` |
| 电子书数 | `books.length` 或 `bookCount` |
| 有声书/专辑数 | `albums.length` |
| 文章收藏 | `mp 非空 ? 1 : 0` |
| 私密阅读数 | `books[secret==1]` 数量 + `albums[secret==1]` 数量 + (`mp` 非空 ? 1 : 0) |
| 公开阅读数 | `books[secret==0]` 数量 + `albums[secret==0]` 数量 |

### 示例

```json
{"api_name": "/shelf/sync", "skill_version": "1.0.3"}
```

---

## 5. 阅读统计 — `/readdata/detail`

查看个人阅读数据，包含时长、天数、排行、偏好分析等。

> **重要**：所有时长字段单位均为**秒**，展示时须转为"x小时y分钟"。

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mode` | string | 否 | 统计维度：`weekly`/`monthly`/`annually`/`overall`，默认 `monthly` |
| `baseTime` | int | 否 | 基准时间戳（`0`=当前周期），服务端归一到周期起点 |

### mode 说明

| mode | 周期粒度 | baseTime 归一化 | 适用场景 |
|------|----------|-----------------|----------|
| `weekly` | 自然周 | 该周周一 00:00 | 本周/某历史周 |
| `monthly` | 自然月 | 该月 1 日 00:00 | 本月/某历史月 |
| `annually` | 自然年 | 该年 1 月 1 日 00:00 | 某年全年/今年至今 |
| `overall` | 全部历史 | 固定为 `0` | 总计 |

### 响应字段

#### 核心统计

| 字段 | 类型 | 说明 |
|------|------|------|
| `baseTime` | int | 统计周期基准时间戳 |
| `readDays` | int | 有效阅读天数（单日阅读满 1 分钟） |
| `totalReadTime` | int | 当前周期总阅读/收听时长（**秒**） |
| `dayAverageReadTime` | int | 日均阅读/收听时长（**秒**），按自然日平均 |
| `compare` | float | 与上一周期日均对比比例（正=增长，负=下降） |
| `readTimes` | object | 分桶阅读时长（key=起始时间戳, value=秒数） |
| `dailyReadTimes` | object | 年度模式每日明细（key=日期时间戳, value=秒数） |

#### 读书排行

| 字段 | 类型 | 说明 |
|------|------|------|
| `readLongest` | array | 读得最多的书排行（最多 10 条，<5分钟已过滤） |
| `readLongest[].book` | object | 书籍信息（bookId, title, author, cover） |
| `readLongest[].albumInfo` | object | 有声内容信息（有声书时返回） |
| `readLongest[].readTime` | int | 阅读/收听时长（秒） |
| `readLongest[].recordReadingTime` | int | 朗读/记录类时长（秒） |
| `readLongest[].tags` | array | 标签（如"笔记最多""单日阅读最久"） |

#### 阅读统计摘要

| 字段 | 类型 | 说明 |
|------|------|------|
| `readStat` | array | 统计摘要数组 |
| `readStat[].stat` | string | 名称（"读过""读完""阅读""笔记"） |
| `readStat[].counts` | string | 值文案（"12本""45天""120条"） |
| `readStat[].scheme` | string | App 跳转链接 |

#### 偏好分析

| 字段 | 类型 | 说明 |
|------|------|------|
| `preferCategory` | array | 偏好分类（最多 8 个） |
| `preferCategory[].categoryTitle` | string | 分类名称 |
| `preferCategory[].parentCategoryTitle` | string | 父分类名称 |
| `preferCategory[].val` | float | 偏好权重（归一化） |
| `preferCategory[].readingTime` | int | 阅读时长（秒） |
| `preferCategory[].readingCount` | int | 阅读本数 |
| `preferCategoryWord` | string | 偏好分类文案 |
| `preferTime` | array | 24h 时段分布（秒），从 6 点开始到次日 5 点 |
| `preferTimeWord` | string | 偏好时段文案 |
| `preferAuthor` | array | 偏好作者数组 |
| `preferAuthor[].name` | string | 作者名 |
| `preferAuthor[].count` | int | 阅读本数 |
| `preferAuthor[].readTime` | string | 阅读时长（格式化字符串，如"5小时30分钟"） |
| `preferPublisher` | array | 偏好出版社数组 |
| `preferPublisher[].name` | string | 出版社名 |
| `preferPublisher[].count` | int | 阅读本数 |

#### 其他字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `readRate` | int | 文字阅读占比百分比 |
| `wrReadTime` | int | 文字阅读时长（秒） |
| `wrListenTime` | int | 听书/TTS/有声内容时长（秒） |
| `rank.text` | string | 好友排行文案（如"朋友中排第3名"） |
| `registTime` | int | 注册时间戳 |
| `medals` | array | 勋章数组（≥3 个时返回） |
| `recordReadingTime` | int | 总朗读/记录类阅读时长（秒，overall 模式） |

### 跨区间查询

接口只支持固定自然周期，不支持自定义起止日期。跨区间需组合：

1. 优先用大周期减少调用次数
2. 跨年按自然年拆分，累加 `totalReadTime`
3. 不完整边界优先使用 `dailyReadTimes` 做日级扣减

### 示例

```json
// 本月统计
{"api_name": "/readdata/detail", "mode": "monthly", "skill_version": "1.0.3"}

// 2025年全年
{"api_name": "/readdata/detail", "mode": "annually", "baseTime": 1735689600, "skill_version": "1.0.3"}

// 总计
{"api_name": "/readdata/detail", "mode": "overall", "skill_version": "1.0.3"}
```

---

## 6. 笔记与划线

### 笔记统计口径

```
总笔记数 = reviewCount + noteCount + bookmarkCount
可导出内容 = 划线内容 + 想法/点评内容（书签仅统计数量）
```

- `noteCount` = 划线/高亮原文条数（不是总笔记数）
- `reviewCount` = 想法/点评数（已含个人点评，不可重复加）
- `bookmarkCount` = 书签数（仅统计，不可导出）

---

### 6.1 笔记本概览 — `/user/notebooks`

获取所有有笔记的书籍列表。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `count` | int | 否 | 每页数量，默认 `20` |
| `lastSort` | int | 否 | 翻页游标（上一页最后一条的 `sort`） |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `totalBookCount` | int | 有笔记的书籍总数 |
| `totalNoteCount` | int | 笔记总条数 |
| `hasMore` | int | 是否有更多（`1`=有） |
| `books[].bookId` | string | 书籍 ID |
| `books[].book` | object | 书籍信息（title, author, cover） |
| `books[].reviewCount` | int | 想法/点评数 |
| `books[].noteCount` | int | 划线数 |
| `books[].bookmarkCount` | int | 书签数 |
| `books[].readingProgress` | int | 阅读进度 |
| `books[].markedStatus` | int | 标记状态（`1`=读完, `0`=在读） |
| `books[].sort` | int | 排序值（翻页用） |

#### 分页规则

- 首次只传 `count`
- `hasMore` 为 `1` 时，取最后一项的 `sort` 作为下一页的 `lastSort`
- 禁止使用 `params` 嵌套或 `offset`/`limit`

#### 示例

```json
// 首页
{"api_name": "/user/notebooks", "count": 20, "skill_version": "1.0.3"}

// 下一页
{"api_name": "/user/notebooks", "count": 20, "lastSort": 1778312777, "skill_version": "1.0.3"}
```

---

### 6.2 单本书划线 — `/book/bookmarklist`

获取某本书的所有划线内容（自动过滤书签，仅返回划线）。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍 ID |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `updated` | array | 划线数组 |
| `updated[].bookmarkId` | string | 划线唯一 ID |
| `updated[].bookId` | string | 书籍 ID |
| `updated[].chapterUid` | int | 所在章节 UID |
| `updated[].markText` | string | 划线原文 |
| `updated[].createTime` | int | 创建时间（Unix 时间戳） |
| `updated[].type` | int | 类型 |
| `updated[].range` | string | 位置范围 |
| `updated[].colorStyle` | int | 划线颜色样式 |
| `chapters` | array | 章节信息数组（chapterUid, chapterIdx, title） |
| `book` | object | 书籍信息 |

#### 示例

```json
{"api_name": "/book/bookmarklist", "bookId": "3300045871", "skill_version": "1.0.3"}
```

---

### 6.3 个人想法/点评 — `/review/list/mine`

获取当前用户在某本书的所有个人内容（划线想法、章节点评、整本书评）。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bookid` | string | 是 | 书籍 ID（注意是小写 `bookid`） |
| `synckey` | int | 否 | 翻页游标，默认 `0` |
| `count` | int | 否 | 每页数量，默认 `20` |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `reviews` | array | 想法/点评数组 |
| `reviews[].review.reviewId` | string | 唯一 ID |
| `reviews[].review.content` | string | 内容文本 |
| `reviews[].review.createTime` | int | 创建时间 |
| `reviews[].review.star` | int | 评分（0-5，`-1`=无评分） |
| `reviews[].review.chapterName` | string | 所在章节名 |
| `reviews[].review.isFinish` | int | 是否读完 |
| `totalCount` | int | 总条数 |
| `hasMore` | int | 是否有更多（`1`=有） |
| `synckey` | int | 翻页游标 |

#### 示例

```json
{"api_name": "/review/list/mine", "bookid": "3300045871", "skill_version": "1.0.3"}
```

---

### 6.4 章节划线热度 — `/book/underlines`

获取章节内每条划线的热度统计（**不含划线文本**）。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍 ID |
| `chapterUid` | int | 是 | 章节 UID |
| `synckey` | int | 否 | 增量同步 key，默认 `0` |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `bookId` | string | 书籍 ID |
| `chapterUid` | int | 章节 UID |
| `underlines` | array | 划线热度统计数组 |
| `underlines[].range` | string | 划线位置范围（如 `"393-401"`） |
| `underlines[].count` | int | 划线人数 |
| `underlines[].score` | int | 热度分数 |
| `underlines[].type` | int | 划线类型 |
| `synckey` | int | 同步 key |

#### 示例

```json
{"api_name": "/book/underlines", "bookId": "3300045871", "chapterUid": 107, "skill_version": "1.0.3"}
```

---

### 6.5 热门划线 — `/book/bestbookmarks`

获取全书的 Popular Highlights，**含划线原文和人数**。服务端固定返回前 20 条，不支持分页。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍 ID |
| `chapterUid` | int | 否 | 章节 UID（`0`=全部章节），默认 `0` |
| `synckey` | int | 否 | 增量同步 key，默认 `0` |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `synckey` | int | 同步 key |
| `totalCount` | int | 热门划线总数 |
| `items` | array | 热门划线数组 |
| `items[].bookId` | string | 书籍 ID |
| `items[].userVid` | string | 代表用户 VID |
| `items[].bookmarkId` | string | 划线唯一 ID |
| `items[].chapterUid` | int | 所在章节 UID |
| `items[].range` | string | 划线位置范围 |
| `items[].markText` | string | 划线原文文本 |
| `items[].totalCount` | int | 划线人数 |
| `chapters` | array | 章节信息数组 |

#### 示例

```json
{"api_name": "/book/bestbookmarks", "bookId": "3300045871", "skill_version": "1.0.3"}
```

---

### 6.6 划线下想法 — `/book/readreviews`

获取某条划线下的公开想法/评论。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍 ID |
| `chapterUid` | int | 是 | 章节 UID |
| `reviews` | array | 是 | 要查询的划线范围数组 |
| `reviews[].range` | string | 是 | 划线位置范围（从 bestbookmarks 获取） |
| `reviews[].maxIdx` | int | 否 | 翻页偏移，默认 `0` |
| `reviews[].count` | int | 否 | 每页数量，上限 `20` |
| `reviews[].synckey` | int | 否 | 翻页游标，默认 `0` |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `bookId` | string | 书籍 ID |
| `chapterUid` | int | 章节 UID |
| `reviews` | array | 每个 range 的想法列表 |
| `reviews[].range` | string | 划线范围 |
| `reviews[].totalCount` | int | 该范围下想法总数 |
| `reviews[].hasMore` | int | 是否有更多 |
| `reviews[].maxIdx` | int | 翻页偏移 |
| `reviews[].synckey` | int | 翻页游标 |
| `reviews[].pageReviews` | array | 想法数组 |
| `reviews[].pageReviews[].reviewId` | string | 想法 ID |
| `reviews[].pageReviews[].review.abstract` | string | 划线原文 |
| `reviews[].pageReviews[].review.content` | string | 想法内容 |
| `reviews[].pageReviews[].review.range` | string | 划线位置 |
| `reviews[].pageReviews[].review.createTime` | int | 创建时间 |
| `reviews[].pageReviews[].review.author` | object | 作者信息 |

#### 示例

```json
{
  "api_name": "/book/readreviews",
  "bookId": "3300045871",
  "chapterUid": 107,
  "reviews": [{"range": "900-2004", "count": 10}],
  "skill_version": "1.0.3"
}
```

---

### 6.7 单条想法详情 — `/review/single`

获取单条想法/评论的完整详情。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `reviewId` | string | 是 | 想法/评论 ID |
| `commentsCount` | int | 否 | 评论数量，默认 `10` |
| `commentsDirection` | int | 否 | 评论排序：`0`=倒序, `1`=正序 |
| `likesCount` | int | 否 | 点赞数量，默认 `10` |
| `likesDirection` | int | 否 | 点赞排序：`0`=倒序 |
| `synckey` | int | 否 | 增量同步 key，默认 `0` |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `reviewId` | string | 想法 ID |
| `review` | object | 想法详情（content, bookId, chapterUid, createTime, author） |
| `htmlContent` | string | 富文本内容 |
| `synckey` | int | 同步 key |

---

## 7. 书籍点评 — `/review/list`

获取书籍的公开点评（他人评论，非个人笔记）。

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍 ID |
| `reviewListType` | int | 否 | 筛选类型（见下表），默认 `0` |
| `count` | int | 否 | 每页数量，默认 `20` |
| `maxIdx` | int | 否 | 翻页偏移，默认 `0` |
| `synckey` | int | 否 | 翻页游标，默认 `0` |

### reviewListType 取值

| 值 | 含义 |
|----|------|
| `0` | 全部 |
| `1` | 推荐 |
| `2` | 不行（差评） |
| `3` | 最新 |
| `4` | 一般 |

### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `synckey` | int | 翻页游标 |
| `reviewsCnt` | int | 点评总数 |
| `recentTotalCnt` | int | 最新点评数 |
| `reviewsHasMore` | int | 是否有更多（`1`=有） |
| `reviewsHas5Star` | int | 是否有五星点评 |
| `reviewsHas1Star` | int | 是否有一星差评 |
| `friendCommentCount` | int | 好友点评数 |
| `friendUniqueCount` | int | 点评好友数 |
| `deepVRecommendInfo.title` | string | 如"2337 个资深会员点评" |
| `deepVRecommendInfo.subtitle` | string | 如"其中 2015 人(86.2%)推荐" |
| `deepVRecommendValue` | int | 资深会员推荐比例（`862` = 86.2%） |
| `reviews` | array | 点评数组 |
| `reviews[].idx` | int | 序号（用于翻页） |
| `reviews[].review.reviewId` | string | 点评 ID |
| `reviews[].review.content` | string | 点评文本 |
| `reviews[].review.htmlContent` | string | 点评 HTML |
| `reviews[].review.star` | int | 评分（`20`=一星, `40`=二星, `60`=三星, `80`=四星, `100`=五星） |
| `reviews[].review.isFinish` | int | 是否读完 |
| `reviews[].review.createTime` | int | 创建时间 |
| `reviews[].review.chapterName` | string | 章节名 |
| `reviews[].review.author.name` | string | 评论者昵称 |
| `reviews[].review.author.avatar` | string | 评论者头像 |
| `reviews[].review.author.userVid` | string | 评论者 vid |

### 翻页方式

用上一页最后一条的 `idx` 作为下一页的 `maxIdx`，带上 `synckey`。

### 示例

```json
// 查看推荐点评
{"api_name": "/review/list", "bookId": "3300045871", "reviewListType": 1, "skill_version": "1.0.3"}

// 查看最新点评
{"api_name": "/review/list", "bookId": "3300045871", "reviewListType": 3, "skill_version": "1.0.3"}
```

---

## 8. 发现推荐

### 8.1 个性化推荐 — `/book/recommend`

基于用户阅读记录的个性化推荐（与 App「为你推荐」一致）。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `count` | int | 否 | 每页数量，默认 `12` |
| `maxIdx` | int | 否 | 翻页偏移，默认 `0` |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `books` | array | 推荐书籍数组 |
| `books[].bookId` | string | 书籍 ID |
| `books[].title` | string | 书名 |
| `books[].author` | string | 作者 |
| `books[].cover` | string | 封面图 URL |
| `books[].intro` | string | 简介 |
| `books[].category` | string | 分类 |
| `books[].reason` | string | 推荐理由 |
| `books[].readingCount` | int | 在读人数 |
| `books[].searchIdx` | int | 结果序号（翻页用） |
| `books[].newRating` | int | 评分（0-100） |
| `books[].newRatingCount` | int | 评分人数 |
| `books[].newRatingDetail.title` | string | 评分标签 |
| `books[].price` | int | 价格（分） |
| `books[].payType` | int | 付费类型 |
| `books[].type` | int | 书籍类型（`0`=电子书） |

#### 翻页方式

用 `searchIdx` 作为下一页的 `maxIdx`。

---

### 8.2 相似书推荐 — `/book/similar`

基于某本书推荐相似书籍。

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bookId` | string | 是 | 书籍 ID |
| `count` | int | 否 | 每页数量，默认 `12` |
| `maxIdx` | int | 否 | 翻页偏移，默认 `0` |
| `sessionId` | string | 否 | 翻页会话 ID（首次不传，后续传回包值） |

#### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `booksimilar.sessionId` | string | 会话 ID（翻页时传回） |
| `booksimilar.books` | array | 推荐书籍数组 |
| `booksimilar.books[].idx` | int | 序号（下一页 maxIdx 用最后一条的 idx） |
| `booksimilar.books[].book.bookInfo` | object | 书籍信息（bookId, title, author, cover） |

#### 示例

```json
{"api_name": "/book/similar", "bookId": "3300045871", "skill_version": "1.0.3"}
```

---

## 9. 用户概况 — `/profile`

> 非独立接口，通过组合已有接口获取用户阅读概况。

### 工作流

1. 调 `/shelf/sync` 获取书架（按 `books.length + albums.length + (mp非空?1:0)` 计算总数）
2. 对书架中的书调 `/book/getprogress` 获取阅读进度
3. 调 `/book/bookmarklist` 获取划线数量

### 输出

- 每本书：书名、进度、最近阅读时间
- 无参数时展示完整阅读概况

---

## 10. 接口索引

| 接口 | 模块 | 必填参数 | 分页方式 |
|------|------|----------|----------|
| `/store/search` | 搜索 | `keyword` | `maxIdx`（searchIdx） |
| `/book/info` | 书籍 | `bookId` | 无 |
| `/book/chapterinfo` | 书籍 | `bookId` | 无 |
| `/book/getprogress` | 书籍 | `bookId` | 无 |
| `/shelf/sync` | 书架 | 无 | 无 |
| `/readdata/detail` | 统计 | 无 | 无（mode + baseTime） |
| `/user/notebooks` | 笔记 | 无 | `lastSort`（游标） |
| `/book/bookmarklist` | 笔记 | `bookId` | 无 |
| `/review/list/mine` | 笔记 | `bookid` | `synckey` |
| `/book/underlines` | 笔记 | `bookId`, `chapterUid` | `synckey` |
| `/book/bestbookmarks` | 笔记 | `bookId` | 无（固定 20 条） |
| `/book/readreviews` | 笔记 | `bookId`, `chapterUid`, `reviews` | `maxIdx` + `synckey` |
| `/review/single` | 笔记 | `reviewId` | 无 |
| `/review/list` | 点评 | `bookId` | `maxIdx`（idx）+ `synckey` |
| `/book/recommend` | 推荐 | 无 | `maxIdx`（searchIdx） |
| `/book/similar` | 推荐 | `bookId` | `maxIdx`（idx）+ `sessionId` |
