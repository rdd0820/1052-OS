import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Check,
  Clock3,
  Gauge,
  ShieldAlert,
  Sunrise,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AsyncState,
  Button,
  Dialog,
  Field,
  Input,
  Surface,
  Switch,
  Textarea,
} from "../../components/ui";
import { settingsApi } from "../../data/api";
import { SectionPage } from "../layout";
import pageStyles from "../pages.module.css";
import styles from "../settings.module.css";

const agentFormSchema = z.object({
  permissionProfile: z.enum(["read-only", "default", "danger-full-access"]),
  userPrompt: z.string(),
  morningBriefEnabled: z.boolean(),
  morningBriefTime: z.string(),
});
type AgentForm = z.infer<typeof agentFormSchema>;

const AUTO_CONTEXT_MESSAGE_LIMIT = 160;
const AUTO_COMPACT_TOKEN_LIMIT = 80_000;

export default function AgentSettings() {
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: ["settings", "agent"],
    queryFn: settingsApi.getAgent,
  });
  const [dangerConfirm, setDangerConfirm] = useState<AgentForm | null>(null);
  const form = useForm<AgentForm>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      permissionProfile: "default",
      userPrompt: "",
      morningBriefEnabled: false,
      morningBriefTime: "08:30",
    },
  });
  useEffect(() => {
    if (!settings.data) return;
    form.reset({
      permissionProfile: settings.data.permissionProfile,
      userPrompt: settings.data.userPrompt,
      morningBriefEnabled: settings.data.morningBrief.enabled,
      morningBriefTime: settings.data.morningBrief.time,
    });
  }, [form, settings.data]);
  const save = useMutation({
    mutationFn: (value: AgentForm) => {
      return settingsApi.updateAgent({
        permissionProfile: value.permissionProfile,
        userPrompt: value.userPrompt,
        morningBrief: {
          enabled: value.morningBriefEnabled,
          time: value.morningBriefTime,
        },
      })
    },
    onSuccess: (data) => {
      client.setQueryData(["settings", "agent"], data);
      void client.invalidateQueries({ queryKey: ["settings"], exact: true });
      setDangerConfirm(null);
    },
  });
  const submit = (value: AgentForm) => {
    return value.permissionProfile === "danger-full-access" &&
      settings.data?.permissionProfile !== "danger-full-access"
      ? setDangerConfirm(value)
      : save.mutate(value);
  }

  const runtimeCapabilities = [
    ["流式回答", "模型生成时立即显示内容"],
    ["渐进加载能力", "只在需要时挂载相关工具包"],
    ["提供商缓存", "复用模型提供商支持的提示缓存"],
    ["运行检查点", "为长任务保留恢复状态"],
    ["恢复时补充上下文", "继续任务时重新注入关键状态"],
    ["自动上下文维护", "接近 token 线或历史窗口过长时自动生成检查点"],
  ];
  return (
    <SectionPage>
      <AsyncState loading={settings.isLoading} error={settings.error}>
        <form
          className={styles.settingsStack}
          onSubmit={form.handleSubmit(submit)}
        >
          <Surface title="权限边界">
            <div className={styles.permissionGrid}>
              {[
                [
                  "read-only",
                  "只读",
                  "只允许查看和分析，所有写入操作都会被阻止。",
                ],
                [
                  "default",
                  "需要确认",
                  "安全读取自动执行，敏感操作由你逐次确认。",
                ],
                [
                  "danger-full-access",
                  "完全访问",
                  "允许 Runtime 直接修改本地与系统状态。",
                ],
              ].map(([value, title, text]) => (
                <label
                  key={value}
                  className={
                    form.watch("permissionProfile") === value
                      ? styles.permissionActive
                      : ""
                  }
                >
                  <input
                    type="radio"
                    value={value}
                    {...form.register("permissionProfile")}
                  />
                  <ShieldAlert size={17} />
                  <strong>{title}</strong>
                  <small>{text}</small>
                </label>
              ))}
            </div>
          </Surface>

          <Surface title="运行行为">
            <div className={styles.settingRows}>
              {runtimeCapabilities.map(([title, description]) => (
                <div key={title}>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </div>
              ))}
            </div>
          </Surface>

          <Surface title="上下文与个性化">
            <div className={pageStyles.formGrid}>
              <div className={styles.contextPolicyGrid}>
                <div>
                  <Archive size={16} />
                  <span>
                    <strong>自动上下文窗口</strong>
                    <small>
                      运行时自动保留最近约 {AUTO_CONTEXT_MESSAGE_LIMIT}{" "}
                      条有效模型消息，旧内容进入检查点摘要。
                    </small>
                  </span>
                </div>
                <div>
                  <Gauge size={16} />
                  <span>
                    <strong>自动压缩线</strong>
                    <small>
                      估算上下文达到{" "}
                      {AUTO_COMPACT_TOKEN_LIMIT.toLocaleString("zh-CN")} tokens
                      或消息窗口过长时触发。
                    </small>
                  </span>
                </div>
                <div>
                  <Clock3 size={16} />
                  <span>
                    <strong>检查点恢复</strong>
                    <small>
                      压缩后生成窗口编号与运行轨迹，继续任务时重新注入关键状态。
                    </small>
                  </span>
                </div>
              </div>
              <Field label="晨间简报时间">
                <Input type="time" {...form.register("morningBriefTime")} />
              </Field>
              <div className={styles.inlineSwitch}>
                <span>
                  <strong>晨间简报</strong>
                  <small>
                    按设定时间生成每日 Intel Center 简报，默认只回写 1052 OS
                    聊天流与通知中心。
                  </small>
                </span>
                <Switch
                  label="晨间简报"
                  checked={form.watch("morningBriefEnabled")}
                  onCheckedChange={(checked) =>
                    form.setValue("morningBriefEnabled", checked, {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
              <p className={styles.briefNote}>
                <Sunrise size={15} />
                晨间简报会采集新闻、行情和跨板块联动信号，输出中文摘要、异常观察、风险机会和主要来源。外部飞书或微信投递需要在定时任务里单独显式配置。
              </p>
              <Field label="附加系统指令">
                <Textarea
                  {...form.register("userPrompt")}
                  placeholder="仅在确有长期需求时添加"
                />
              </Field>
            </div>
          </Surface>
          <div className={styles.stickySave}>
            <Button variant="primary" type="submit" disabled={save.isPending}>
              <Check size={15} />
              保存 Agent 设置
            </Button>
          </div>
        </form>
        <Dialog
          open={Boolean(dangerConfirm)}
          onOpenChange={(open) => !open && setDangerConfirm(null)}
          title="确认启用完全访问"
          footer={
            <>
              <Button onClick={() => setDangerConfirm(null)}>取消</Button>
              <Button
                variant="danger"
                onClick={() => dangerConfirm && save.mutate(dangerConfirm)}
              >
                确认启用
              </Button>
            </>
          }
        >
          <p className={styles.warningText}>
            完全访问允许 Agent
            在不逐次询问的情况下修改文件、运行命令和改变系统状态。仅在你了解当前模型及工具行为时使用。
          </p>
        </Dialog>
      </AsyncState>
    </SectionPage>
  );
}
