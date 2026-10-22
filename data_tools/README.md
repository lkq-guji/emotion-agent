# B：数据准备

下一步编写独立转换脚本，把训练/验证集的每个 prediction_point 转成一条输入和一条独立标签。仅保留截至 target_user_turn_id 的消息，验证输入中没有目标 Assistant 回复和未来轮次。

按 conversation_id 划分数据，记录被剔除的无效样本及原因。原始大数据放在 data/raw/，转换产物放在 data/processed/，两者已被 Git 忽略。提交脚本和小型统计报告。
